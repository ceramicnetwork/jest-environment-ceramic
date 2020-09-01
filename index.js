const { IpfsUtils } = require('@ceramicnetwork/ceramic-common')
const Ceramic = require('@ceramicnetwork/ceramic-core').default
const Wallet = require('identity-wallet').default
const NodeEnvironment = require('jest-environment-node')
const { dir } = require('tmp-promise')

module.exports = class CeramicEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context)
    this.seed = config.seed || '0x0000000000000000000000000000000000000000000000000000000000000000'
  }

  async setup() {
    await super.setup()
    this.global.Uint8Array = Uint8Array
    this.global.ArrayBuffer = ArrayBuffer
    this.tmpFolder = await dir({ unsafeCleanup: true })
    this.global.ipfs = await IpfsUtils.createIPFS({
      repo: this.tmpFolder.path + '/ipfs/',
      config: {
        Addresses: { Swarm: [] },
        Bootstrap: [],
      },
    })
    this.global.ceramic = await Ceramic.create(this.global.ipfs, {
      stateStorePath: this.tmpFolder.path + '/ceramic/',
    })
    this.global.wallet = await Wallet.create({
      ceramic: this.global.ceramic,
      seed: this.seed,
      getPermission: () => Promise.resolve([]),
      useThreeIdProv: false,
    })
    await this.global.ceramic.setDIDProvider(this.global.wallet.getDidProvider())
  }

  async teardown() {
    await this.global.ceramic.close()
    await this.global.ipfs.stop()
    await this.tmpFolder.cleanup()
    await super.teardown()
  }
}
