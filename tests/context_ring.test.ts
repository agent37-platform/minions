import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContextRing } from '../client/src/components/InputToolbar.tsx';

function renderPercentage(usedTokens: number, windowTokens: number): string {
  return renderToStaticMarkup(createElement(ContextRing, {
    context: {
      used_tokens: usedTokens,
      window_tokens: windowTokens,
    },
  }));
}

assert.match(renderPercentage(14, 100), />14%<\/span>/);
assert.match(renderPercentage(1, 3), />33%<\/span>/);
assert.match(renderPercentage(0, 0), />0%<\/span>/);
assert.match(renderPercentage(100, 100), />100%<\/span>/);
assert.match(renderPercentage(200, 100), />100%<\/span>/);
assert.match(renderPercentage(200, 100), /title="Context: 200% used"/);

console.log('Context ring percentage tests passed');
