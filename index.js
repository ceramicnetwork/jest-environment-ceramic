const Ceramic = require('@ceramicnetwork/core').default
const dagJose = require('dag-jose').default
const Components = require('ipfs-core/src/components')
const ApiManager = require('ipfs-core/src/api-manager')
const NodeEnvironment = require('jest-environment-node')
const legacy = require('multiformats/legacy')
const multiformats = require('multiformats/basics')
const { dir } = require('tmp-promise')

multiformats.multicodec.add(dagJose)

function noop() {}

async function createIPFS(repo) {
  const options = {
    ipld: { formats: [legacy(multiformats, dagJose.name)] },
    repo,
    silent: true,
  }

  const apiManager = new ApiManager()
  const { api } = apiManager.update(
    { init: Components.init({ apiManager, options, print: noop }) },
    async () => {
      throw new Error('Not initialized')
    }
  )

  const initializedApi = await api.init({ profiles: ['test'] })
  const startedApi = await initializedApi.start()

  const { api: ipfs } = apiManager.update({ _isMockFunction: false, ...startedApi })
  return ipfs
}

class CeramicEnvironment extends NodeEnvironment {
  async setup() {
    this.tmpFolder = await dir({ unsafeCleanup: true })
    this.global.ipfs = await createIPFS(this.tmpFolder.path + '/ipfs/')
    this.global.ceramic = await Ceramic.create(this.global.ipfs, {
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

module.exports = CeramicEnvironment
