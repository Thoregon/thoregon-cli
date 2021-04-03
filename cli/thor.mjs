/**
 * Thoregon CLI
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import ThoregonPackage from "../lib/archive/thoregonpackage.mjs";
import commander       from '/commander';

const program = new commander.Command();
program.version('0.0.2');

//
// convertions for options
//

function myParseInt(value, dummyPrevious) {
    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
        throw new commander.InvalidOptionArgumentError('Not a number.');
    }
    return parsedValue;
}

function increaseVerbosity(dummyValue, previous) {
    return previous + 1;
}

function collect(value, previous) {
    return previous.concat([value]);
}

function commaSeparatedList(value, dummyPrevious) {
    return value.split(',');
}

//
// utilities
//

function inpectCommand(command) {
    // The option value is stored as property on command because we called .storeOptionsAsProperties()
    console.log(`Called '${command.name()}'`);
    console.log(`args: ${command.args}`);
    console.log('opts: %o', command.opts());
};

//
// commands
//

/*  define options with different positions
program
    .enablePositionalOptions();
    .option('-p, --progress');
*/

/*
 *  Create a thoregon system package
 */
program
    .command('thoregon [file]')
    .description('create a thoregon package')
    .option("-k, --kind <kind>", "kind of package, one of ['browser', 'node', 'electron']", 'browser')
    .action(async (file, options) => {
        file = file || 'thoregon.zip';  // 'thoregon.thar'
        console.log(`packaging '${options.kind}' to ${file}`);
        let tp = new ThoregonPackage();
        await tp.package(options.kind, file);
    });

/*
 * start dev server
 */
program
    .command('dev', { isDefault: true })
    .description('start dev service and open thoregon app in browser')
    .action((options) => {
        console.log("starting dev service...");
    });

program.parse();
