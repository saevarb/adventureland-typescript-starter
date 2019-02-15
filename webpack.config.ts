import webpack from "webpack";
import path from "path";
import fs from "fs";
import http, { ClientRequest } from "http";
import querystring from "querystring";
import FriendlyErrorsWebpackPlugin from "friendly-errors-webpack-plugin";

// Useful type definitions
interface Chunk {
  name: string;
  hash: string;
  files: string[];
  entryModule: {
    rawRequest: string;
  };
}

interface SaveSlot {
  name: string;
  slot: number;
}

interface APIResponse {
  message: string;
}

// Utility functions
const mkSaveSlot = (name: string, slot: number): SaveSlot => ({ name, slot });

function getAuthCookie(): string {
  if (!fs.existsSync(".secret")) {
    throw new Error("You need to create a .secret file with your auth token.");
  }
  const secret = fs.readFileSync(".secret").toString();
  return `auth=${secret}`;
}

////////////////////////////////////////////////////////////////////////////////
///                          \/ EDIT THIS \/                                ////
////////////////////////////////////////////////////////////////////////////////
// This structure determines which files are compiled as well as
// how they are saved to AL
const saveMap: { [filename: string]: SaveSlot } = {
  "./src/ai/ranger.ts": mkSaveSlot("ranger", 1),
  // "./src/ai/priest.ts": mkSaveSlot("priest", 2),
  // "./src/ai/merchant.ts": mkSaveSlot("merchant", 3),
  // "./src/ai/mage.ts": mkSaveSlot("mage", 4),
};
////////////////////////////////////////////////////////////////////////////////
///                          /\ EDIT THIS /\                                ////
////////////////////////////////////////////////////////////////////////////////

const authCookie: string = getAuthCookie();

class ALUploader {
  // A map from our chunks to their versions so that we can avoid uploading
  // files that didn't change
  private chunkVersions: Map<string, string> = new Map();

  // A map from the output JS file names to the request that is handling them,
  // so that we can abort ongoing requests if a rebuild is triggered before a request
  // from a previous rebuild is finished
  private requestMap: Map<string, ClientRequest> = new Map();

  private uploadFile = (jsFile: string, saveName: string, slot: number) => {
    const code = fs.readFileSync(jsFile);
    const req = http.request(
      {
        hostname: "adventure.land",
        path: "/api/save_code",
        method: "POST",
        headers: {
          Cookie: authCookie,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
      (res) => {
        res.on("data", (response) => {
          const asJson: APIResponse[] = JSON.parse(response.toString());
          console.log(`${jsFile}: ${asJson[0].message}`);
        });
      }
    );
    req.on("error", (err) => {
      console.error("Error talking to the AL API:", err);
    });

    const r = this.requestMap.get(jsFile);
    if (r) {
      console.log("Aborted ongoing request..");
      r.abort();
    }
    this.requestMap.set(jsFile, req);

    // yes, the API is kind of convoluted.
    // pack it into a JSON object, stringify it and then encode such that
    // we do: /save_code?method=save_code?args=<URI encoded json object>
    const obj = {
      method: "save_code",
      arguments: JSON.stringify({
        slot: slot.toString(),
        code: code.toString(),
        name: saveName,
        log: "0",
      }),
    };

    req.write(querystring.stringify(obj));
    req.end();
  };
  private processFile = (typescriptFile: string, jsFile: string) => {
    console.log("Processing ", typescriptFile, jsFile);
    const save = saveMap[typescriptFile];
    this.uploadFile(jsFile, save.name, save.slot);
  };
  private processChunk = (chunk: Chunk) => {
    chunk.files.forEach((f) => this.processFile(chunk.entryModule.rawRequest, f));
  };
  public apply(compiler: webpack.Compiler) {
    compiler.hooks.afterEmit.tap("ALUploader", (compilation) => {
      const changed: Chunk[] = compilation.chunks.filter((chunk: Chunk) => {
        const old = this.chunkVersions.get(chunk.name);
        this.chunkVersions.set(chunk.name, chunk.hash);
        return !old || old !== chunk.hash;
      });

      changed.forEach(this.processChunk);
    });
  }
}

const config: webpack.Configuration = {
  mode: "development",
  // list all the files here that you would like to build individually.
  devtool: "eval-source-map",
  entry: Object.entries(saveMap).reduce((prev, [filename, save]) => ({ ...prev, [save.name]: filename }), {}),
  output: {
    filename: "dist/[name].js",
    path: __dirname,
  },
  resolve: {
    extensions: [".ts"],
    modules: [path.resolve(__dirname, "src")],
  },
  plugins: [new FriendlyErrorsWebpackPlugin(), new ALUploader()],
  module: {
    rules: [
      {
        include: [path.resolve(__dirname, "src")],
        test: /\.ts$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
    ],
  },
};

export default config;
