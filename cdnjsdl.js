const request = require("request");
const fs = require("fs");
const path = require("path");
const program = require("commander");

function constUrl(lib) {
  return `https://api.cdnjs.com/libraries/${lib}`;
}

function constDownloadUrl(lib, version, filename) {
  return (
    "https://cdnjs.cloudflare.com/ajax/libs/" + `${lib}/${version}/${filename}`
  );
}

function mkdirsSync(dirname) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkdirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}

function writeFile(filename, contents, destName) {
  fs.writeFile(filename, contents, function(err) {
    if (err) {
      console.error("failed to write", path.basename(destName));
      // console.error(err);
      return;
    }
    fs.rename(filename, destName, err => {
      if (err) {
        console.error("failed to move", destName);
        // console.log(err);
      }
    });
  });
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    request(
      {
        url: url,
        headers: {
          "User-Agent": "request"
        },
        timeout: 10000
      },
      (err, res, body) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(body);
      }
    );
  });
}

async function getrequest(lib, version) {
  try {
    let versions = await makeRequest(constUrl(lib));
    versions = JSON.parse(versions);
    versions = versions.assets;
    if (version) {
      let versionIndex = versions.findIndex(e => {
        return e.version === version;
      });
      if (versionIndex == -1) {
        throw new Error(`${lib} with @${version} is not found`);
      }
      let downloadFiles = versions[versionIndex].files;
      downloadFiles.forEach(filename => {
        makeRequest(constDownloadUrl(lib, version, filename))
          .then(res => {
            mkdirsSync(
              `lib/${lib}/${version}/${
                path.dirname(filename) == "." ? "" : path.dirname(filename)
              }`
            );
            writeFile(
              path.basename(filename),
              res,
              `lib/${lib}/${version}/${filename}`
            );
          })
          .catch(err => {
            console.log("failed to make request");
            console.log(lib, filename);
            // console.error(err);
          });
      });
    } else {
      let downloadFiles = versions[0].files;
      let version = versions[0].version
      downloadFiles.forEach(filename => {
        makeRequest(constDownloadUrl(lib, version, filename))
          .then(res => {
            mkdirsSync(
              `lib/${lib}/${version}/${
                path.dirname(filename) == "." ? "" : path.dirname(filename)
              }`
            );
            writeFile(
              path.basename(filename),
              res,
              `lib/${lib}/${version}/${filename}`
            );
          })
          .catch(err => {
            console.log("failed to make request");
            console.log(lib, filename);
            // console.error(err);
          });
      });
    }
  } catch (err) {
    console.log("failed to requst", lib, version);
    console.log("trying one more time");
    // console.error(err);
    getrequest(lib, version);
  }
}

program
  .option(
    "-a, --add",
    "add cdns you want to download. ex: jquery@1.0.0, vue@2.6.0"
  )
  .parse(process.argv);

program.on("--help", function() {
  console.log("  Examples:");
  console.log("");
  console.log("-a jquery@1.0.0, vue@2.6.0");
  console.log("");
});

if (program.add) {
  program.args.forEach(e => {
    let cdns = e.split("@");
    getrequest(cdns[0], cdns[1]);
  });
}
