import { loggers } from '@projecttacoma/node-fhir-server-core';
import { ValueSetResolver } from 'fqm-execution';
import { Filter } from 'mongodb';
import { v4 } from 'uuid';
import { findResourcesWithQuery } from '../db/dbOperations';
import { BadRequestError, ResourceNotFoundError } from '../util/errorUtils';
import { PackageArgs } from '../requestSchemas';
import fs from 'fs';
import { getMongoQueryFromRequest } from './queryUtils';
import { z } from 'zod';
import { CRMIShareableLibrary, CRMIShareableMeasure, FhirArtifact } from '../types/service-types';

const logger = loggers.get('default');

/**
 * Takes in an array of FHIR resources and creates a FHIR searchset Bundle with the
 * inputted resources as entries
 */
export function createSearchsetBundle<T extends FhirArtifact>(entries: T[]): fhir4.Bundle<T> {
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
 * Takes in an array of FHIR resources and creates a FHIR batch-response Bundle with the
 * created resources as entries
 * TODO: should this response bundle be of type batch-response or something else?
 * The CRMI IG only says the following: The Bundle result containing the new resource(s)
 * https://build.fhir.org/ig/HL7/crmi-ig/OperationDefinition-crmi-draft.html
 */
export function createBatchResponseBundle<T extends FhirArtifact>(entries: T[]): fhir4.Bundle<T> {
  return {
    resourceType: 'Bundle',
    meta: { lastUpdated: new Date().toISOString() },
    id: v4(),
    type: 'batch-response',
    total: entries.length,
    entry: entries.map(e => ({ resource: e }))
  };
}

/**
 *
 * Takes in a number of FHIR resources and creates a FHIR searchset Bundle without entries
 */
export function createSummarySearchsetBundle<T extends FhirArtifact>(count: number): fhir4.Bundle<T> {
  return {
    resourceType: 'Bundle',
    meta: { lastUpdated: new Date().toISOString() },
    id: v4(),
    type: 'searchset',
    total: count
  };
}

/**
 * Creates pagination links for the search results bundle.
 * Logic pulled from implementation in deqm-test-server
 * https://github.com/projecttacoma/deqm-test-server/blob/dc89180bf4b355e97db38cfa84471dd16db82e93/src/util/baseUtils.js#L61
 *
 * @param {string} baseUrl Base URL of the server and FHIR base path. Should be pulled from request.
 * @param {string} resourceType The resource type these results are for.
 * @param {url.URLSearchParams} searchParams The search parameter object used for the initial query pulled from the request.
 * @param {{numberOfPages: number, page: number}} resultsMetadata The results metadata object from the mongo results.
 * @returns {fhir4.BundleLink[]} The links that should be added to the search st results bundle.
 */
export function createPaginationLinks(
  baseUrl: string,
  resourceType: string,
  searchParams: URLSearchParams,
  resultsMetadata: { numberOfPages: number; page: number }
): fhir4.BundleLink[] {
  const { numberOfPages, page } = resultsMetadata;
  const links = [];

  // create self link, including query params only if there were any
  if (searchParams.toString() !== '') {
    links.push({
      relation: 'self',
      url: new URL(`${resourceType}?${searchParams}`, baseUrl).toString()
    });
  } else {
    links.push({
      relation: 'self',
      url: new URL(`${resourceType}`, baseUrl).toString()
    });
  }

  // first page
  searchParams.set('page', '1');
  links.push({
    relation: 'first',
    url: new URL(`${resourceType}?${searchParams}`, baseUrl).toString()
  });

  // only add previous and next if appropriate
  if (page > 1) {
    searchParams.set('page', `${page - 1}`);
    links.push({
      relation: 'previous',
      url: new URL(`${resourceType}?${searchParams}`, baseUrl).toString()
    });
  }
  if (page < numberOfPages) {
    searchParams.set('page', `${page + 1}`);
    links.push({
      relation: 'next',
      url: new URL(`${resourceType}?${searchParams}`, baseUrl).toString()
    });
  }

  // last page
  searchParams.set('page', `${numberOfPages}`);
  links.push({
    relation: 'last',
    url: new URL(`${resourceType}?${searchParams}`, baseUrl).toString()
  });

  return links;
}

/**
 * Takes in a mongo query, finds a Measure based on the query and all dependent
 * Library resources and bundles them together with the Measure in a collection bundle
 */
export async function createMeasurePackageBundle(
  query: Filter<any>,
  params: z.infer<typeof PackageArgs>
): Promise<fhir4.Bundle<FhirArtifact>> {
  const mongoQuery = getMongoQueryFromRequest(query);
  const measure = (await findResourcesWithQuery<CRMIShareableMeasure[]>(mongoQuery, 'Measure'))[0].data;
  if (!measure || !(measure.length > 0)) {
    throw new ResourceNotFoundError(
      `No resource found in collection: Measure, with ${Object.keys(query)
        .map(key => `${key}: ${query[key]}`)
        .join(' and ')}`
    );
  }
  if (measure.length > 1) {
    throw new BadRequestError(
      `Multiple resources found in collection: Measure, with ${Object.keys(query)
        .map(key => `${key}: ${query[key]}`)
        .join(' and ')}. /Measure/$cqfm.package operation must specify a single Measure`
    );
  }

  const measureForPackaging = measure[0];
  const includeTerminology = params['include-terminology'] ?? false;
  logger.info(`Assembling collection bundle from Measure ${measureForPackaging.id}`);
  if (measureForPackaging.library && measureForPackaging.library.length > 0) {
    const [mainLibraryRef] = measureForPackaging.library;
    const mainLibQuery = getQueryFromReference(mainLibraryRef);
    const libs = (await findResourcesWithQuery<CRMIShareableLibrary[]>(mainLibQuery, 'Library'))[0].data;
    if (!libs || libs.length < 1) {
      throw new ResourceNotFoundError(
        `Could not find Library ${mainLibraryRef} referenced by Measure ${measureForPackaging.id}`
      );
    }
    const mainLib = libs[0];

    const result = await createDepLibraryBundle(mainLib, includeTerminology);
    result.entry?.unshift({ resource: measureForPackaging });

    return result;
  } else {
    throw new BadRequestError(`Uploaded measure: ${measureForPackaging.id} does not reference a Library`);
  }
}

/**
 * Takes in a mongo query, finds a Library resource based on the query and all dependent
 * Library resources and bundles them together with the Library in a collection bundle
 */
export async function createLibraryPackageBundle(
  query: Filter<any>,
  params: z.infer<typeof PackageArgs>
): Promise<{ libraryBundle: fhir4.Bundle<FhirArtifact>; rootLibRef?: string }> {
  const mongoQuery = getMongoQueryFromRequest(query);
  const library = (await findResourcesWithQuery<CRMIShareableLibrary[]>(mongoQuery, 'Library'))[0].data;
  if (!library || !(library.length > 0)) {
    throw new ResourceNotFoundError(
      `No resource found in collection: Library, with ${Object.keys(query)
        .map(key => `${key}: ${query[key]}`)
        .join(' and ')}`
    );
  }
  if (library.length > 1) {
    throw new BadRequestError(
      `Multiple resources found in collection: Library, with ${Object.keys(query)
        .map(key => `${key}: ${query[key]}`)
        .join(' and ')}. /Library/$cqfm.package operation must specify a single Library`
    );
  }
  const libraryForPackaging = library[0];

  const rootLibRef =
    libraryForPackaging.url && libraryForPackaging.version
      ? `${libraryForPackaging.url}|${libraryForPackaging.version}`
      : libraryForPackaging.url ?? libraryForPackaging.id;

  logger.info(`Assembling collection bundle from Library ${libraryForPackaging.id}`);

  return {
    libraryBundle: await createDepLibraryBundle(libraryForPackaging, params['include-terminology'] ?? false),
    rootLibRef: rootLibRef
  };
}

/**
 * Takes in the main library from either Measure/$cqfm.package or Library/$cqfm.package
 * and returns a bundle of all the dependent libraries
 */
export async function createDepLibraryBundle(
  mainLib: CRMIShareableLibrary,
  includeTerminology?: boolean
): Promise<fhir4.Bundle<FhirArtifact>> {
  const allLibsDups = await getAllDependentLibraries(mainLib);
  // de-dup by id using map
  const idMap = new Map(allLibsDups.map(lib => [lib.id, lib]));
  const allLibs = Array.from(idMap.values());
  const result: fhir4.Bundle<FhirArtifact> = { resourceType: 'Bundle', type: 'collection', id: v4() };
  result.entry = allLibs.map(r => ({
    resource: r
  }));

  if (includeTerminology) {
    for (const lib of allLibs) {
      await addValueSetsToBundle(lib, result);
    }
  }

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

function hasNoDependencies(lib: CRMIShareableLibrary) {
  return !lib.relatedArtifact || (Array.isArray(lib.relatedArtifact) && lib.relatedArtifact.length === 0);
}

/*
 * Resolves ValueSets listed in the relatedArtifact property of a library
 * Optionally uses a file-system cache to grab ValueSets that have been resolved previously
 */
export async function getDependentValueSets(lib: CRMIShareableLibrary, useFileCache = true) {
  if (hasNoDependencies(lib)) {
    return [];
  }

  logger.info('Resolving ValueSets');

  const depValueSetUrls =
    (lib.relatedArtifact as fhir4.RelatedArtifact[])
      .filter(ra => ra.type === 'depends-on' && ra.resource?.includes('ValueSet'))
      .map(ra => ra.resource as string) ?? [];

  const valueSets: fhir4.ValueSet[] = [];
  let missingUrls: string[] = [];

  if (useFileCache) {
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
      missingUrls = depValueSetUrls;
    }
  } else {
    missingUrls = depValueSetUrls;
  }

  // If we didn't find all in the cache, need to resolve via VSAC
  if (missingUrls.length > 0) {
    if (!process.env.VSAC_API_KEY) {
      throw new Error(
        'Attempting to resolve ValueSets, but no API key found. Add "VSAC_API_KEY" to your local .env file'
      );
    }

    const valueSetResolver = new ValueSetResolver(process.env.VSAC_API_KEY);

    const [resolvedValueSets, errors] = await valueSetResolver.getExpansionForValuesetUrls(missingUrls);

    if (useFileCache) {
      resolvedValueSets.forEach(vs => {
        fs.writeFileSync(`./cache/${vs.id}.json`, JSON.stringify(vs));
        logger.debug(`Wrote ${vs.url} to cache`);
      });
    }

    if (errors.length > 0) {
      throw new Error(`Errors encountered resolving ValueSets: ${errors.join(', ')}`);
    }

    valueSets.push(...resolvedValueSets);
  }

  return valueSets;
}

/*
 * Updates the bundle entry array in-place to include any resolved ValueSets
 */
async function addValueSetsToBundle(rootLibrary: CRMIShareableLibrary, currentBundle: fhir4.Bundle) {
  const valueSets = await getDependentValueSets(rootLibrary);

  currentBundle.entry?.push(
    ...valueSets.map(vs => ({
      resource: vs
    }))
  );
}

/**
 * Iterate through relatedArtifact of library and return list of all dependent libraries used
 */
export async function getAllDependentLibraries(lib: CRMIShareableLibrary): Promise<CRMIShareableLibrary[]> {
  logger.debug(`Retrieving all dependent libraries for library: ${lib.id}`);
  const results = [lib];

  // If the library has no dependencies, we are done
  if (hasNoDependencies(lib)) {
    return results;
  }

  // This filter checks for the 'Library' keyword on all related artifacts
  const depLibUrls = (lib.relatedArtifact as fhir4.RelatedArtifact[])
    .filter(ra => ra.type === 'depends-on' && ra.resource?.includes('Library'))
    .map(ra => ra.resource as string);
  // Obtain all libraries referenced in the related artifact, and recurse on their dependencies
  const libraryGets = depLibUrls.map(async url => {
    const libQuery = getQueryFromReference(url);
    const libs = (await findResourcesWithQuery(libQuery, 'Library'))[0].data;
    if (!libs || libs.length < 1) {
      throw new ResourceNotFoundError(
        `Failed to find dependent library with ${
          libQuery.id ? `id: ${libQuery.id}` : `canonical url: ${libQuery.url}`
        }${libQuery.version ? ` and version: ${libQuery.version}` : ''}`
      );
    }
    return getAllDependentLibraries(libs[0] as CRMIShareableLibrary);
  });

  const allDeps = await Promise.all(libraryGets);

  results.push(...allDeps.flat());

  return results;
}
