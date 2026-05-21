import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanOurladsPlayerName, parseOurladsQBs } from "./_nflOurladsDepthParse.js";

test("cleanOurladsPlayerName — Last, First with draft suffix", () => {
  assert.equal(cleanOurladsPlayerName("ALLEN, JOSH 18/1"), "Josh Allen");
  assert.equal(cleanOurladsPlayerName("ALLEN, KYLE U/Det"), "Kyle Allen");
});

test("parseOurladsQBs — 2026 row markup with logo_thumb team codes", () => {
  const html = `
    <table>
      <tr class='row-dc-wht'>
        <td><img src='https://www.ourlads.com/images/logo_thumb_BUF.gif' /></td>
        <td>QB</td><td>17</td>
        <td><a href='https://www.ourlads.com/nfldepthcharts/player/33720/'>ALLEN, JOSH 18/1</a></td>
        <td>11</td>
        <td><a href='https://www.ourlads.com/nfldepthcharts/player/49886/'>ALLEN, KYLE U/Det</a></td>
      </tr>
      <tr class='row-dc-wht'>
        <td><img src='https://www.ourlads.com/images/logo_thumb_SD.gif' /></td>
        <td>QB</td><td>10</td>
        <td><a href='https://www.ourlads.com/nfldepthcharts/player/11111/'>HERBERT, JUSTIN 20/1</a></td>
      </tr>
    </table>
  `;
  const depth = parseOurladsQBs(html, { minTeams: 2 });
  assert.ok(depth);
  assert.equal(depth.BUF.qb1, "Josh Allen");
  assert.equal(depth.BUF.qb2, "Kyle Allen");
  assert.equal(depth.LAC.qb1, "Justin Herbert");
});
