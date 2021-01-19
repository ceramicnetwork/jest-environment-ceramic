const Ceramic = require('@ceramicnetwork/core').default
const dagJose = require('dag-jose').default
const IPFS = require('ipfs-core')
const NodeEnvironment = require('jest-environment-node')
const legacy = require('multiformats/legacy')
const multiformats = require('multiformats/basics')
const { dir } = require('tmp-promise')

multiformats.multicodec.add(dagJose)

module.exports = class CeramicEnvironment extends NodeEnvironment {
  async setup() {
    this.tmpFolder = await dir({ unsafeCleanup: true })
    this.global.ipfs = await IPFS.create({
      ipld: { formats: [legacy(multiformats, dagJose.name)] },
      profiles: ['test'],
      repo: this.tmpFolder.path + '/ipfs/',
      silent: true,
    })
    this.global.ceramic = await Ceramic.create(this.global.ipfs, {
      anchorOnRequest: false,
      stateStorePath: this.tmpFolder.path + '/ceramic/',
    })
  }

  async teardown() {
    await super.teardown()
    await this.global.ceramic.close()
    await this.global.ipfs.stop()
    await this.tmpFolder.cleanup()
  }
}
