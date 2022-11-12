/**
 * Thoregon CLI
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import ThoregonPackage from "../lib/archive/thoregonpackage.mjs";
import commander       from '/commander';
import ComponentPacker from "../lib/archive/componentpacker.mjs";

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
    .option("-k, --kind <kind>", "kind of package, one of ['browser', 'node']", 'browser')      // "kind of package, one of ['browser', 'node', 'electron']"
    .option("-i, --identity <identity>", "identity file containing keypairs", "./thoregonidentity.mjs")
    .action(async (file, options) => {
        const { kind, identity } = options;
        file = file || (kind === 'browser') ? 'thoregonB.zip' : 'thoregonN.zip';
        console.log(`packaging '${options.kind}' to ${file}`);
        const tp = new ThoregonPackage();
        await tp.package(file, { kind, identity });
    });

/*
 *  Create a deployable component package
 */
program
    .command('pack <directory> [packname]')
    .description('create a component package')
    .option("-o, --output <output>", "output filename")
    .option("-s, --skip <modules...>", "skip names modules")
    .option("-m, --multi", "the specified loaction contains multiple components, package all together in one library")
    .option("-i, --identity <identity>", "identity file containing keypairs")
    .option("-t, --test", "include test data")
    .action(async (directory, packname, options) => {
        const p = new ComponentPacker();
        // check if dir exists
        // use last path element as package name
        console.log(`packaging component '${directory}'`);
        const { multi, identity, output, skip, test } = options;
        let archiveprops = await p.build(directory, packname, { multi, identity, output, skip, test } );
        console.log("Archive Properties", JSON.stringify(archiveprops, null, 4));
        // console.log('Package: ', archiveprops.archive);
    });


/*
 *  Create a deployable component package
 */
program
    .command('wrapes6 <file>')
    .description("wrap a '.js' file with ES6 exports")
    .action(async (file, options) => {
        // check
        console.log(`wrapping '${file}' to ${file}`);
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
