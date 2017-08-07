#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const execa = require("execa");
const latestVersion = require("latest-version");
const pruddy = require("pruddy-error");
const readPkg = require("read-pkg");
const getInstalledPath = require("get-installed-path");

const production = process.env.NODE_ENV === "production";

function findOutdatedPackages(packageNames) {
    return Promise
        .all(packageNames.map(name =>
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
    return getInstalledPath(packageName, { local: true })
        .then(pkgPath => fs.realpathSync(pkgPath))
        .then(readPkg)
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
        const markedLatest = Object.keys(packages).filter(name => packages[name] === "latest");
        if (markedLatest.length > 0) {
            console.log("Checking the following packages marked 'latest':");
            markedLatest.forEach(name => {
                console.log(` - ${name}`);
            });
            return findOutdatedPackages(markedLatest)
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
                });
        }
        console.log(" -> No packages found");
    })
    .catch(err => {
        console.log(pruddy(err));
    });
