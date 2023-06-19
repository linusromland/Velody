#!/bin/sh

# Define your environment variable name and the file path
ENV_VAR_NAME="GOOGLE_SERVICE_ACCOUNT"
FILE_PATH="account.json"

# Check if the file exists
if [ ! -f "$FILE_PATH" ]; then
  # Read the environment variable value
  ENV_VAR_VALUE=$(eval echo \$$ENV_VAR_NAME)

  # Write the value to the file
  echo "$ENV_VAR_VALUE" > "$FILE_PATH"

  # Print a message for logging purposes
  echo "File created with contents from the $ENV_VAR_NAME environment variable"
  echo "File path: $FILE_PATH"
  echo "File contents:"
  cat "$FILE_PATH"
fi