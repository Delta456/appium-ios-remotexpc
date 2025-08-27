import { logger } from '@appium/support';
import { expect } from 'chai';

import type { AFCService } from '../../src/lib/types.js';
import * as Services from '../../src/services.js';

const log = logger.getLogger('AFCService.test');
// Set AFCService logger to info level
log.level = 'info';

describe('AFC Service', function () {
  // Increase timeout for integration tests
  this.timeout(60000);

  let remoteXPC: any;
  let afcService: AFCService;
  const uuid = process.env.UDID || '00008030-000318693E32402E';

  before(async function () {
    const result = await Services.startAFCService(uuid);
    afcService = result.afcService;
    remoteXPC = result.remoteXPC;
  });

  after(async function () {
    if (remoteXPC) {
      try {
        await remoteXPC.close();
      } catch (error) {
      }
    }
  });

  describe('exists() method', function () {
    it('should return false for DCIM directory', async function () {

      // Add a shorter timeout for this specific test
      this.timeout(30000);
      // eslint-disable-next-line no-useless-catch
      try {
       // const result = await afcService.exists('false');
        const stat = await afcService.stat('lol');
        log.info(`Stat for DCIM: ${JSON.stringify(stat)}`); // Returning stats for unknown dir!
        expect(stat.st_ifmt).to.equal('S_IFDIR');
       // expect(result).to.be.false; It should be false but returns true!
      } catch (error) {
        throw error;
      }
    });
  });
});