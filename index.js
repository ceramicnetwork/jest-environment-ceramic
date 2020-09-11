const Ceramic = require('@ceramicnetwork/ceramic-core').default
const dagJose = require('dag-jose').default
const Wallet = require('identity-wallet').default
const IPFS = require('ipfs')
const NodeEnvironment = require('jest-environment-node')
const legacy = require('multiformats/legacy')
const multiformats = require('multiformats/basics')
const { dir } = require('tmp-promise')

multiformats.multicodec.add(dagJose)

async function createIPFS(repo) {
  return await IPFS.create({
    config: { Bootstrap: [] },
    ipld: { formats: [legacy(multiformats, dagJose.name)] },
    offline: true,
    repo,
    silent: true,
  })
}

async function createWallet(ceramic, seed) {
  return await Wallet.create({ ceramic, seed, getPermission: () => Promise.resolve([]) })
}

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
    this.global.ipfs = await createIPFS(this.tmpFolder.path + '/ipfs/')
    this.global.ceramic = await Ceramic.create(this.global.ipfs, {
      stateStorePath: this.tmpFolder.path + '/ceramic/',
    })
    this.global.wallet = await createWallet(this.global.ceramic, this.seed)
    await this.global.ceramic.setDIDProvider(this.global.wallet.getDidProvider())
  }

  async teardown() {
    await this.global.ceramic.close()
    await this.global.ipfs.stop()
    await this.tmpFolder.cleanup()
    await super.teardown()
  }
}
