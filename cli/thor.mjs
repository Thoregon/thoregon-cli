/**
 * Thoregon CLI
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import ThoregonPackage  from "../lib/archive/thoregonpackage.mjs";
import commander        from '/commander';
import ComponentPacker  from "../lib/archive/componentpacker.mjs";
import ContainerBuilder from "../lib/container/containerbuilder.mjs";
import dotenv           from "dotenv";
dotenv.config();

// @see: https://github.com/tj/commander.js
const program = new commander.Command();
program.version('0.1.0');

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
    .description("create a thoregon package. will be generated at 'dist/thoregon/<packagename>'")
    .option("-k, --kind <kind>", "kind of package, one of ['browser', 'node']", 'node')      // "kind of package, one of ['browser', 'node', 'electron']"
    .option("-i, --identity <identity>", "identity file containing keypairs", "./thoregonidentity.mjs")
    .action(async (file, options) => {
        const { kind, identity } = options;
        file = file || (kind === 'browser') ? 'thoregonB.zip' : 'thoregonN.zip';
        console.log(`packaging '${options.kind}' to ${file}`);
        const tp = new ThoregonPackage();
        await tp.package(file, { kind, identity });
        console.log("> THOREGON package ready");
    });

/*
 *  Create a deployable component package
 */
program
    .command('pack <directory> [packname]')
    .description("create a component package. will be generated at 'dist/packages/<packname>'")
    .requiredOption("-i, --identity <identity>", "identity file containing keypairs")
    .option("-o, --output <output>", "output filename")
    .option("-s, --skip <modules...>", "skip names modules")
    .option("--no-ui", "include ui in package")
    .option("--no-assets", "include ui in package")
    .option("-p, --path <path>", "target path of the package, default is the directory structure. can not be combined with multiple (-m)")
    .option("-m, --multi", "the specified location contains multiple components, package all together in one library")
    .option("-t, --test", "include test data")
    .action(async (directory, packname, options) => {
        const p = new ComponentPacker();
        // check if dir exists
        // use last path element as package name
        console.log(`packaging component '${directory}'`);
        const { multi, identity, output, skip, ui, assets, path, test } = options;
        let archiveprops = await p.build(directory, packname, { multi, identity, output, ui, assets, skip, path, test } );
        console.log("Archive Properties", JSON.stringify(archiveprops, null, 4));
        // console.log('Package: ', archiveprops.archive);
    });

/*
 * Build a service agent container
 * - specify owner (keypair)
 * - add components
 */
program
    .command('agent <containername>')
    .description("build a service agent container. will be generated at 'dist/containers/<containername>'")
    .requiredOption("-i, --identity <identity>", "identity file containing keypairs")
    .option("-n, --neuland <neulqnd>", "location of the neuland DB (relative to './dist/packages')")
    .option("-c, --components <components...>", "location of the component archives (relative to './dist/packages', see 'pack <component>')")
    .option("-t, --thoregon <thoregonpackage>", "location of the thoregon package (relative to './dist/thoregon')", 'thoregonN.zip')
    .action(async (containername, options) => {
        // check
        const { thoregon, identity, components, neuland } = options;
        console.log(`agent '${containername}'`);
        console.log(`-n '${neuland}'`);
        console.log(`-i '${identity}'`);
        console.log(`-t '${thoregon}'`);
        console.log(`-c '${components}'`);

        const containerBuilder = new ContainerBuilder();
        const containerInfo = await containerBuilder.create({ containername , identity, thoregon, components, neuland });
        console.log("Container:\n" , JSON.stringify(containerInfo, null, 4));
    });

/*
 * modify a service agent and build a new container
 * - add/remove components
 */
program
    .command('agentadd <containername>')
    .description("modify a service agent and build a new container")
    .requiredOption("-i, --identity <identity>", "identity file containing keypairs")
    .option("-c, --components <components...>", "location of the component archives (relative to './dist/packages', see 'pack <component>')")
    .action(async (containername, options) => {
        // check
        const { identity, components } = options;
        console.log(`agentadd '${containername}'`);
        console.log(`-i '${identity}'`);
        console.log(`-c '${components}'`);

        const containerBuilder = new ContainerBuilder();
        const containerInfo = await containerBuilder.addComponents({ containername , identity, components });
        console.log("Container:\n" , JSON.stringify(containerInfo, null, 4));
    });

/*
 *  Create a deployable component package
 */
/*
program
    .command('wrapes6 <file>')
    .description("wrap a '.js' file with ES6 exports")
    .action(async (file, options) => {
        // check
        console.log(`wrapping '${file}' to ${file}`);
    });
*/

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
