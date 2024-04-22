#!/bin/sh -ex

# Link external /data volume to /app/data
ln -sf /data /app/data
pnpm run start