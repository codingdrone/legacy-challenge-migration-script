// Retry to migrate the challenges
const config = require('config')
const challengeService = require('../services/challengeService')
const resourceService = require('../services/resourceService')
const util = require('util')
const logger = require('../util/logger')
const getErrorService = require('../services/errorService')
const errorService = getErrorService()

const retries = {
  Challenge: retryChallenge,
  Resource: retryResource,
  ALL: retry
}

module.exports = retries

/**
 * Retry to migrate challenges logged in error file
 *
 * @param  {[type]} spinner Loading animate object
 */
async function retryChallenge (spinner, writeError = true) {
  process.env.IS_RETRYING = true
  const offset = config.get('BATCH_SIZE')
  const errorIds = errorService.getErrorIds('challengeId')

  let finish = false
  let skip = 0
  let batch = 1

  while (!finish) {
    let result
    try {
      spinner.prefixText = `Batch-${batch}`
      spinner.text = 'Loading challenges'
      spinner.start()
      const ids = errorIds.slice(skip, skip + offset)
      if (ids.length > 0) {
        result = await challengeService.getChallenges(ids)
        finish = result.finish
      } else {
        finish = true
        result = {
          challenges: []
        }
      }
    } catch (e) {
      console.log('error', e)
      logger.debug(util.inspect(e))
      spinner.fail(`Fail to load challenge on batch ${batch}`)
      finish = true
      process.exit(1)
    }
    if (result.challenges.length < 1) {
      spinner.text = 'Done'
    }
    if (!finish && result.challenges.length > 0) {
      await challengeService.save(result.challenges, spinner)
    }
    spinner.succeed()
    skip += offset
    batch++
  }
  if (writeError) {
    errorService.close()
  }
}

/**
 * Retry to migrate resources logged in error file
 *
 * @param  {[type]} spinner Loading animate object
 */
async function retryResource (spinner, writeError = true) {
  process.env.IS_RETRYING = true
  const offset = config.get('BATCH_SIZE')
  const errorIds = errorService.getErrorIds('resourceId')

  let finish = false
  let skip = 0
  let batch = 1

  while (!finish) {
    let result
    try {
      spinner.prefixText = `Batch-${batch}`
      spinner.text = 'Loading resources'
      spinner.start()
      const ids = errorIds.slice(skip, skip + offset)
      if (ids.length > 0) {
        result = await resourceService.getResources(ids)
        finish = result.finish
      } else {
        finish = true
        result = {
          resources: []
        }
      }
    } catch (e) {
      console.log('error', e)
      logger.debug(util.inspect(e))
      spinner.fail(`Fail to load resources on batch ${batch}`)
      finish = true
      process.exit(1)
    }
    if (result.resources.length < 1) {
      spinner.text = 'Done'
    }
    if (!finish && result.resources.length > 0) {
      await resourceService.saveResources(result.resources, spinner)
    }
    spinner.succeed()
    skip += offset
    batch++
  }
  if (writeError) {
    errorService.close()
  }
}

/**
 * Retry to migrate records logged in error file
 *
 * @param  {[type]} spinner Loading animate object
 */
async function retry (spinner) {
  for (const modelName in retries) {
    if (modelName !== 'ALL') {
      await retries[modelName](spinner, false)
    }
  }
  errorService.close()
  logger.info('All error data have been attempted to be migrated')
}
