const { network } = require("hardhat");
const { developmentChains,DECIMALS,INITIAL_ANSWER } = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;  // we are using deployments object to get two functions : deploy and log
    const { deployer } = await getNamedAccounts();  // we are getting deployer account from getNamedAccounts() function
    // const chainId = network.config.chainId;

    if(developmentChains.includes(network.name)){           // or we can do  if chainId==31337
        log("Local network detected ! Deploying mocks...");
        await deploy("MockV3Aggregator",{
            contract:"MockV3Aggregator",
            from: deployer,
            log: true,
            args:[DECIMALS,INITIAL_ANSWER],
        });

        log("Mocks deployed!");
        log("-------------------------------------------");
        
    }
}

module.exports.tags = ["all", "mocks"];    // yarn hardhat deploy --tags mocks         this will run only our deploy-mocks script