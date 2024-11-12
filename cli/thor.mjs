/**
 * Thoregon CLI
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import ThoregonPackage   from "../lib/archive/thoregonpackage.mjs";
import commander         from '/commander';
import ComponentPacker   from "../lib/archive/componentpacker.mjs";
import ContainerBuilder  from "../lib/container/containerbuilder.mjs";
import ContainerDeployer from "../lib/deploy/containerdeployer.mjs";
import dotenv            from "dotenv";
import UnArchiver        from "../lib/archive/unarchiver.mjs";
import DNSManager        from "/evolux.web/lib/dns/dnsmanager.mjs";
import NamecheapDNS      from "/evolux.web/lib/dns/namecheap/namecheapdns.mjs";

dotenv.config();

//
// DNS
//

const DNS = {
    namecheap: { apiKey: 'c154b631ac6945a591e36458a004d6b1', apiUser: 'MartinKirchner', clientIp: process.env.CLIENTID ?? '81.217.87.214' }
}

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
        file = file || (kind === 'browser') ? 'thoregonB' : 'thoregonN';
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
        // console.log("Archive Properties", JSON.stringify(archiveprops, null, 4));
        console.log('Package: ', archiveprops.archive);
    });


program
    .command('unpack <packname>')
    .description("unpack a component package.")
    .option("-o, --output <outputdir>", "output dirname")
    .action(async (packname, options) => {
        const unpack = new UnArchiver();
        // check if dir exists
        // use last path element as package name
        console.log(`unpackaging '${packname}'`);
        const { output } = options;
        await unpack.unpackArchive(packname, output);
        console.log('Unpack: ', packname);
    });

/*
 * DNS
 */

const dns = program.command('dns');

dns
    .command('list <domain> [type]')
    .option("-p, --provider <providername>", "DNS provider name", 'namecheap')
    .action(async (domain, type, options) => {
        const { provider } = options;
        // console.log("DNS list", provider, domain, type);
        const dnsmgr = DNSManager.use(provider, DNS[provider]);
        const records = await dnsmgr.listRecords(domain, type);
        console.log('DNS list', domain, '\n', records.map(rec => JSON.stringify(rec)).join('\n'));
    })

dns
    .command('add <name> <recordType> <data>')
    .option("-p, --provider <providername>", "DNS provider name", 'namecheap')
    .action(async (name, recordType, data, options) => {
        try {
            const { provider } = options;
            const hostName     = name.split('.')[0];
            const domain       = name.split('.')[1] + '.' + name.split('.')[2];
            // console.log("DNS add", provider, name, recordType, data);
            const dnsmgr = DNSManager.use(provider, DNS[provider]);
            const success = await dnsmgr.addRecord(domain, { recordType, hostName, data });
            console.log(`DNS '${provider}' add '${name}' ${recordType} ${data} ${success ? 'successful' : 'failed'}`);
        } catch (e) {
            console.error("DNS add:", e);
        }
    })


/*
 * merge component packages
 */

/*
program
    .command('merge <packname> <packages...>')
    .description("create a merged component package with <packages...>. will be generated at 'dist/packages/<packname>'")
    .action(async (packname, packages) => {
        if (packname.indexOf('/') > -1) return console.log("It seems there is no package name specified, would be:", packname, `\nAdd the package name right after 'merge'> thor merge <packname> ${[packname, ...packages].join(', ')}`);

        console.log("Packages: ", packages?.join(', '));
        console.log("Packname: ", packname);

        const p = new ComponentPacker();
        let archiveprops = await p.merge(packname, packages);
        console.log("Archive Properties", JSON.stringify(archiveprops, null, 4));
    })
*/

/*
 * Build a service agent container
 * - specify owner (keypair)
 * - add components
 */
program
    .command('agent <containername>')
    .description("build a service agent container. will be generated at 'dist/containers/<containername>'")
    .requiredOption("-i, --identity <identity>", "identity file containing keypairs")
    .option("-a, --appagent <appagent>", "location of the app agent name")
    .option("-n, --neuland <neuland>", "location of the neuland DB (relative to './dist/packages')")
    .option("-c, --components <components...>", "location of the component archives (relative to './dist/packages', see 'pack <component>')")
    .option("-d, --dependencies <dependencies>", "location of the dependencies file")
    .option("-t, --thoregon <thoregonpackage>", "location of the thoregon package (relative to './dist/thoregon')", 'thoregonN.zip')
    .option("-p, --peers <peers...>", "list id ids from known peers")
    .option("-pm, --peermodule <peermodule>", "module to import returning known peers")
    .action(async (containername, options) => {
        // check
        const { thoregon, identity, components, neuland, appagent, dependencies } = options;
        console.log(`agent '${containername}'`);
        if (appagent) console.log(`-a '${appagent}'`);
        console.log(`-n '${neuland}'`);
        if (neuland) console.log(`-i '${identity}'`);
        if (thoregon) console.log(`-t '${thoregon}'`);
        if (components) console.log(`-c '${components}'`);
        if (dependencies) console.log(`-d '${dependencies}'`);

        const containerBuilder = new ContainerBuilder();
        const containerInfo = await containerBuilder.create({ containername, dependencies , identity, thoregon, components, neuland, appagent });
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

// todo: create agentmod (no only add components)

/*
 * build a container for an app UI
 * - supports create/login SSI
 * - supports connect devices
 * - general entry point, supports all (known) apps
 *   - local repo for available apps
 * - opens specified app
 */
program
    .command('app <containername>')
    .description("build a container for an app UI")
    .option("-a, --app <app>", "app which will be started if no app is specified")
    .option("-i, --identity <identity>", "identity file containing keypairs, only for DEV and TESTING")
    .option("-c, --components <components...>", "location of the component archives (relative to './dist/packages', see 'pack <component>')")
    .option("-t, --thoregon <thoregonpackage>", "location of the thoregon package (relative to './dist/thoregon')", 'thoregonB.zip')
    .option("--dev", "build a dev container")
    .action(async (containername, options) => {
        // check
        const { app, identity, thoregon, components, peers, peersmodule } = options;
        console.log(`app '${containername}'`);
        console.log(`-a '${app}'`);
        console.log(`-i '${identity}'`);
        console.log(`-c '${components}'`);

        const containerBuilder = new ContainerBuilder();
        const containerInfo = await containerBuilder.createUI({ thoregon, containername, app, components });
        console.log("Container:\n" , JSON.stringify(containerInfo, null, 4));
    });

/**
 * deploy settings for a container
 * run container with settings
 *
 */
program
    .command('deploy <containername> [deployname]')
    .description("deploy a container with <containername>. Either a full path or a name relative to './dist/container'.\nif no deployname the config name will be used.\nthe deployname is relative to './deploy'")
    .requiredOption("-c, --config <configname>", "use config (relative to './dist/thoregon')")
    .option("-d, --domain <domain>", "domain for this container")
    .option("-i, --identity <identity>", "identity file containing keypairs, only for DEV and TESTING")
    .option("-n, --neulanddb <neulanddb>", "path to neuland DB to deploy")
    .action(async (containername, deployname, options) => {
        const { identity, configname, neulanddb, domain } = options;
        console.log(`-d '${domain}'`);
        console.log(`-c '${configname}'`);
        if (!deployname) deployname = configname;
        if (identity)  console.log(`-i '${identity}'`);
        if (neulanddb) console.log(`-n '${neulanddb}'`);
        console.log(`Deployname; ${deployname}`);

        const deployer   = new ContainerDeployer();
        const deployInfo = await deployer.deployContainer({ containername, deployname, configname, neulanddb, identity, domain });
        console.log("Deploy:\n", JSON.stringify(deployInfo, null, 4));

    })
/**
 * deploy settings for a container
 * run container with settings
 *
 */
program
    .command('deployui <containername> [deployname]')
    .description("deploy an app UI with <containername>. Either a full path or a name relative to './dist/www'.\nif no deployname the config name will be used.\nthe deployname is relative to './deploy'")
    .requiredOption("-d, --domain <domain>", "domain for this container")
    .requiredOption("-c, --config <configname>", "use config (relative to './dist/thoregon')")
    .requiredOption("-x, --custid <custid>", "id for the customer")
    .action(async (containername, deployname, options) => {
        const { domain, configname, custid } = options;
        if (!deployname) deployname = configname;
        console.log(`-d '${domain}'`);
        console.log(`-s '${configname}'`);
        console.log(`-x '${custid}'`);
        console.log(`Deployname; ${deployname}`);

        const deployer   = new ContainerDeployer();
        const deployInfo = await deployer.deployUIContainer({ containername, deployname, configname, domain, custid });
        console.log("Deploy UI:\n", JSON.stringify(deployInfo, null, 4));
    })
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
