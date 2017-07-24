#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const execa = require("execa");
const latestVersion = require("latest-version");
const pruddy = require("pruddy-error");
const readPkg = require("read-pkg");

const production = process.env.NODE_ENV === "production";

function findOutdatedPackages(packageDict) {
    const latestSpecs = Object.keys(packageDict).filter(name => packageDict[name] === "latest");
    return Promise
        .all(latestSpecs.map(name =>
            latestVersion(name)
                .then(version => ({
                    name,
                    version
                }))
        ))
        .then(latestItems => Promise.all(latestItems.map(latestItem =>
            getPackageVersion(latestItem.name)
                .then(currentVersion => ({
                    name: latestItem.name,
                    latestVersion: latestItem.version,
                    currentVersion
                }))
        )))
        .then(items => items.filter(item => {
            return item.latestVersion !== item.currentVersion;
        }));
}

function getPackageVersion(packageName) {
    const packagePath = fs.realpathSync(path.join(process.cwd(), `./node_modules/${packageName}`));
    return readPkg(packagePath)
        .then(pkgData => {
            const { name, version } = pkgData;
            if (name !== packageName) {
                throw new Error(`Failed processing version for package '${packageName}': Mismatched package name: ${name}`);
            }
            return version;
        });
}

function updatePackages(packageList) {
    const installVersionSpec = packageList
        .map(item => `${item.name}@${item.latestVersion}`);
    return execa(
        "npm",
        ["install", ...installVersionSpec]
    );
}

console.log("Detecting packages with 'latest' specification");
readPkg(process.cwd())
    .then(pkgData => {
        const packages = Object.assign({}, pkgData.dependencies || {});
        if (!production) {
            Object.assign(packages, pkgData.devDependencies || {});
        }
        if (Object.keys(packages).length > 0) {
            return findOutdatedPackages(packages);
        }
        console.log(" -> No packages found");
    })
    .then(outdatedPackages => {
        if (outdatedPackages.length > 0) {
            console.log("Will update the following packages:");
            outdatedPackages.forEach(package => {
                console.log(` - ${package.name}: ${package.currentVersion} => ${package.latestVersion}`);
            });
            return updatePackages(outdatedPackages).then(() => {
                console.log("Done.");
            });
        }
        console.log(" -> No outdated packages found");
    })
    .catch(err => {
        console.log(pruddy(err));
    });
