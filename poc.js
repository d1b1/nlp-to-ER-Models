import minimist from "minimist";

const args = minimist(process.argv.slice(2), {
  string: ["statement"],
  boolean: ["verbose"],
  alias: {
    name: "s",
    verbose: "v",
  },
});

console.log(args);
// > { _: [], verbose: true, v: true, name: 'Budgie', n: 'Budgie' }