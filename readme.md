NB: This guide and starter kit is a WIP.

# TypeScript for Adventure Land

Read on if you're interested in 

- .. writing code for your AL bot locally using your favorite editor and tooling
- .. getting your code automatically uploaded to the AL servers
- .. using TypeScript instead of javascript
- .. using proper modules and even external dependencies from npm (theoretically, but not tested yet)

## If you're new to AL and programming in general ..

TODO: Some static typing zealotry here

## Requirements

- [yarn](https://yarnpkg.com/)
- git

## Getting Started

First of all, you need to find your authentication token for AL:

1. Clone this repository.
2. Visit http://adventure.land.
3. Open the developer tools in your browser.
4. In Firefox, click the "Storage" tab. In Chrome, click the "Application" tab.
5. Click cookies on the left.
6. Find the cooke named `auth` and copy it. It should be a bunch of random-looking numbers and characters.
7. Create a new file named `.secret` where you cloned this repository containing only your token(yes, the name starts with a dot).

Open up your terminal, `cd` to this directory and run `yarn install`. 

Now you need to modify `webpack.config.ts` and specify which typescript files are your "main files", and how they should be saved to the AL servers.

Find this section:

```
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
```

This is the default config. It says that you have a file at `src/ai/` named `ranger.ts` that you wish to compile
and automatically upload to the AL servers, and it will be saved in slot 1 and be named `ranger**.
**Note: You cannot save in slot 0, because that is where the default code is stored.***

It does not matter what your files are named or where they are placed, *as long as they are somewhere under the `src/` subdirectory*.
**Do not specify any other files than those you want to upload**. The example `src/ai/ranger.ts` imports `TestModule` but we do not add `TestModule.ts` to our `saveMap`.

Once you have configured the `saveMap` correctly, you should be able to run `yarn run webpack --watch`, and webpack will automatically compile and upload your TypeScript files
to the AL servers whenever a file is modified.
There are also some preliminary typings for AL in `src/definitions/game.d.ts`, but these are my own and are only as complete as I have needed them to be so far, so some things will be missing, but you can add to them as you wish.

I personally keep my save slots named the same as the classes, since it allows me to simply do `load_code(character.ctype)` to load the correct code for each class. I bind this to 3 on my skillbar, as can be seen in `ranger.ts`.

```
map_key("3", "snippet", 'load_code("' + character.ctype + '")');
```

TODO: Extract typings into a separate library.






