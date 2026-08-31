import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { KEY_PREFIX } from '@callirra/client';

describe('mcp package', () => {
  it('uses the Callirra API key prefix', () => {
    assert.equal(KEY_PREFIX, 'sk-cal-');
  });
});
