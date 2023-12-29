#!/bin/bash

usage="
usage: $(basename "$0") command [-h] [-s] [-d] arguments...
Uploads Measure and Library resources to the measure repository service.
Options:
    -h
        Displays help menu.
    -s [server baseUrl]
        Specifies the base URL of the FHIR server to access.
    -d
        Provides directory path to parse for upload.
"

while getopts ':h:s:d:' option;
do
  case "$option" in
    h)
       echo -e "$usage"
       exit 0
       ;;
    s)
       server=$OPTARG
       ;;
    d)
       directory_path=$OPTARG
       ;;

   \?) printf "illegal option: -%s\n" "$OPTARG" 1>&2
       echo "$usage" 1>&2
       exit 1
       ;;
    : )
      echo "Invalid option: $OPTARG requires an argument" 1>&2
      ;;
  esac
done

if [[ $directory_path == "" ]] ; then
  echo No directory path provided. Provide directory path via the '-d' flag.
  exit 1
fi

if [[ $server == "" ]] ; then
  echo No server URL provided. Provide server URL via the '-s' flag.
  exit 1
fi

echo Using Server URL: $server and directory path: $directory_path

upload_bundle() {
  echo "Uploading resources for bundle $1"
    curl_command="curl -X POST -H 'Content-Type: application/json+fhir' -d @\"$1\" $server -o /dev/null"
    # execute the curl command
    eval "$curl_command"

    echo "Bundle successfully uploaded."
    echo ""
}

# loop over FHIR bundles in specified directory
for file_path in "$directory_path" ; do
  if [[ -d $file_path ]] ; then
    # recurse on directory
    for f in $(find $file_path -name "*.json") ; do
      upload_bundle $f
    done

  elif [[ -f $file_path ]] ; then
    if [[ ${file_path: -5} == ".json" ]] ; then
      upload_bundle $file_path
    fi
  fi
done