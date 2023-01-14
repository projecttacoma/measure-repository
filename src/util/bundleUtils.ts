import { loggers } from '@projecttacoma/node-fhir-server-core';
import { ValueSetResolver } from 'fqm-execution';
import { Filter } from 'mongodb';
import { v4 } from 'uuid';
import { findResourcesWithQuery } from '../db/dbOperations';
import { BadRequestError, ResourceNotFoundError } from '../util/errorUtils';
import fs from 'fs';

const logger = loggers.get('default');

/**
 * Takes in an array of FHIR resources and creates a FHIR searchset Bundle with the
 * inputted resources as entries
 */
export function createSearchsetBundle<T extends fhir4.FhirResource>(entries: T[]): fhir4.Bundle<T> {
  return {
    resourceType: 'Bundle',
    meta: { lastUpdated: new Date().toISOString() },
    id: v4(),
    type: 'searchset',
    total: entries.length,
    entry: entries.map(e => ({ resource: e }))
  };
}

/**
 * Takes in a measure resource, finds all dependent library resources and bundles them
 * together with the measure in a collection bundle
 */
export async function createMeasurePackageBundle(
  measure: fhir4.Measure,
  includeTerminology?: boolean
): Promise<fhir4.Bundle<fhir4.FhirResource>> {
  logger.info(`Assembling collection bundle from Measure ${measure.id}`);
  if (measure.library && measure.library.length > 0) {
    const [mainLibraryRef] = measure.library;
    const mainLibQuery = getQueryFromReference(mainLibraryRef);
    const libs = await findResourcesWithQuery<fhir4.Library>(mainLibQuery, 'Library');
    if (!libs || libs.length < 1) {
      throw new ResourceNotFoundError(`Could not find Library ${mainLibraryRef} referenced by Measure ${measure.id}`);
    }
    const mainLib = libs[0];

    const result = await createDepLibraryBundle(mainLib);
    result.entry?.unshift({ resource: measure });

    if (includeTerminology) {
      const valueSets = await getDependentValueSets(mainLib);

      result.entry?.push(
        ...valueSets.map(vs => ({
          resource: vs
        }))
      );
    }

    return result;
  } else {
    throw new BadRequestError(`Uploaded measure: ${measure.id} does not reference a Library`);
  }
}

/**
 * Takes in a library resource, finds all dependent library resources and bundles them
 * together with the library in a collection bundle
 */
export async function createLibraryPackageBundle(
  library: fhir4.Library,
  includeTerminology?: boolean
): Promise<fhir4.Bundle<fhir4.FhirResource>> {
  logger.info(`Assembling collection bundle from Library ${library.id}`);
  const result = await createDepLibraryBundle(library);

  if (includeTerminology) {
    const valueSets = await getDependentValueSets(library);

    result.entry?.push(
      ...valueSets.map(vs => ({
        resource: vs
      }))
    );
  }

  return result;
}

/**
 * Takes in the main library from either Measure/$package or Library/$package
 * and returns a bundle of all the dependent libraries
 */
export async function createDepLibraryBundle(mainLib: fhir4.Library): Promise<fhir4.Bundle<fhir4.FhirResource>> {
  const allLibsDups = await getAllDependentLibraries(mainLib);
  // de-dup by id using map
  const idMap = new Map(allLibsDups.map(lib => [lib.id, lib]));
  const allLibs = Array.from(idMap.values());
  const result: fhir4.Bundle = { resourceType: 'Bundle', type: 'collection', id: v4() };
  result.entry = allLibs.map(r => ({
    resource: r
  }));
  return result;
}

/**
 * Assemble a mongo query based on a reference to another resource
 * @param {string} reference assumed to be canonical
 * @returns {Filter} mongo query to pass in to mongo controller to search for the referenced resource
 */
export function getQueryFromReference(reference: string): Filter<any> {
  if (reference.includes('|')) {
    const [urlPart, versionPart] = reference.split('|');
    return { url: urlPart, version: versionPart };
  } else {
    return { url: reference };
  }
}

function hasNoDependencies(lib: fhir4.Library) {
  return !lib.relatedArtifact || (Array.isArray(lib.relatedArtifact) && lib.relatedArtifact.length === 0);
}

export async function getDependentValueSets(lib: fhir4.Library) {
  if (hasNoDependencies(lib)) {
    return [];
  }

  logger.info('Resolving ValueSets');

  const depValueSetUrls =
    lib.relatedArtifact
      ?.filter(ra => ra.type === 'depends-on' && ra.resource?.includes('ValueSet'))
      .map(ra => ra.resource as string) ?? [];

  const valueSets: fhir4.ValueSet[] = [];
  const missingUrls: string[] = [];

  if (fs.existsSync('./cache')) {
    const cacheLookup = fs
      .readdirSync('./cache')
      .map(f => JSON.parse(fs.readFileSync(`./cache/${f}`, 'utf8')) as fhir4.ValueSet)
      .reduce((lookup, vs) => {
        if (vs.url) {
          lookup[vs.url] = vs;
        }

        return lookup;
      }, {} as Record<string, fhir4.ValueSet>);

    depValueSetUrls.forEach(url => {
      // TODO: This URL throws an internal server error on VSAC
      // Ignore for now just to test caching
      if (url === 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.114222.4.11.3591') return;

      if (cacheLookup[url]) {
        logger.debug(`Found ${url} in cache`);
        valueSets.push(cacheLookup[url]);
      } else {
        logger.debug(`Could not find ${url} in cache`);
        missingUrls.push(url);
      }
    });
  } else {
    fs.mkdirSync('./cache');
  }

  // If we didn't find all in the cache, need to resolve via VSAC
  if (missingUrls.length > 0) {
    const valueSetResolver = new ValueSetResolver(process.env.VSAC_API_KEY ?? '');

    const [resolvedValueSets, errors] = await valueSetResolver.getExpansionForValuesetUrls(depValueSetUrls);

    resolvedValueSets.forEach(vs => {
      fs.writeFileSync(`./cache/${vs.id}.json`, JSON.stringify(vs));
      logger.debug(`Wrote ${vs.url} to cache`);
    });

    if (errors.length > 0) {
      throw new Error(`Errors encountered resolving ValueSets: ${errors.join(', ')}`);
    }

    valueSets.push(...resolvedValueSets);
  }

  return valueSets;
}

/**
 * Iterate through relatedArtifact of library and return list of all dependent libraries used
 */
export async function getAllDependentLibraries(lib: fhir4.Library): Promise<fhir4.Library[]> {
  logger.debug(`Retrieving all dependent libraries for library: ${lib.id}`);
  const results = [lib];

  // If the library has no dependencies, we are done
  if (!lib.relatedArtifact || (Array.isArray(lib.relatedArtifact) && lib.relatedArtifact.length === 0)) {
    return results;
  }
  // This filter checks for the 'Library' keyword on all related artifacts
  const depLibUrls = lib.relatedArtifact
    .filter(
      ra =>
        ra.type === 'depends-on' &&
        ra.resource?.includes('Library') &&
        ra.resource !== 'http://fhir.org/guides/cqf/common/Library/FHIR-ModelInfo|4.0.1'
    ) // exclude modelinfo dependency
    .map(ra => ra.resource as string);
  // Obtain all libraries referenced in the related artifact, and recurse on their dependencies
  const libraryGets = depLibUrls.map(async url => {
    const libQuery = getQueryFromReference(url);
    const libs = await findResourcesWithQuery(libQuery, 'Library');
    if (!libs || libs.length < 1) {
      throw new ResourceNotFoundError(
        `Failed to find dependent library with ${
          libQuery.id ? `id: ${libQuery.id}` : `canonical url: ${libQuery.url}`
        }${libQuery.version ? ` and version: ${libQuery.version}` : ''}`
      );
    }
    return getAllDependentLibraries(libs[0] as fhir4.Library);
  });

  const allDeps = await Promise.all(libraryGets);

  results.push(...allDeps.flat());

  return results;
}
