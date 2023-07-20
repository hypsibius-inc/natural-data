## Utility Node Packages
When editing utility packages, in order to use them across all functions, please run
```bash
npm run publish
```
This will not publish the package, but will rather create a tarball, copy it to all functions, and install it.
We cannot use `npm link` or `npm install ./directory/` because the linking of the package, outside the root of each function, will not be included when building the image.
Currently *buildpacks* supports doing this, however the function extension of knative does not allow to pass the necessary parameters.
