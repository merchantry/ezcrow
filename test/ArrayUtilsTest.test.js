const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('ArrayUtilsTest', function () {
  async function deployFixture() {
    const arrayUtilsTest = await ethers
      .getContractFactory('ArrayUtilsTest')
      .then(contract => contract.deploy());

    return { arrayUtilsTest };
  }

  beforeEach(async function () {
    const fixtureData = await deployFixture();
    Object.assign(this, fixtureData);
  });

  describe('intersection', function () {
    it('returns the intersection of two arrays', async function () {
      const { arrayUtilsTest } = this;

      const testCases = [
        {
          a: [1, 2, 3, 4, 5],
          b: [3, 4, 5, 6, 7],
          expected: [3, 4, 5],
        },
        {
          a: [1, 2, 3, 4, 5],
          b: [6, 7, 8, 9, 10],
          expected: [],
        },
        {
          a: [1, 2, 3, 4, 5],
          b: [1, 2, 3, 4, 5],
          expected: [1, 2, 3, 4, 5],
        },
      ];

      for (const { a, b, expected } of testCases) {
        expect(await arrayUtilsTest.intersection(a, b)).to.deep.equal(expected);
      }
    });
  });

  describe('slice', function () {
    it('returns a slice of an array', async function () {
      const { arrayUtilsTest } = this;

      const testCases = [
        {
          array: [1, 2, 3, 4, 5],
          start: 2,
          limit: 3,
          expected: [3, 4, 5],
        },
        {
          array: [1, 2, 3, 4, 5],
          start: 0,
          limit: 3,
          expected: [1, 2, 3],
        },
        {
          array: [1, 2, 3, 4, 5],
          start: 4,
          limit: 3,
          expected: [5],
        },
        {
          array: [1, 2, 3, 4, 5],
          start: 5,
          limit: 3,
          expected: [],
        },
      ];

      for (const { array, start, limit, expected } of testCases) {
        expect(await arrayUtilsTest.slice(array, start, limit)).to.deep.equal(
          expected
        );
      }
    });
  });

  describe('range', function () {
    it('returns an array of numbers from start to end', async function () {
      const { arrayUtilsTest } = this;

      const testCases = [
        {
          start: 0,
          end: 5,
          expected: [0, 1, 2, 3, 4],
        },
        {
          start: 2,
          end: 5,
          expected: [2, 3, 4],
        },
        {
          start: 5,
          end: 5,
          expected: [],
        },
        {
          start: 5,
          end: 10,
          expected: [5, 6, 7, 8, 9],
        },
      ];

      for (const { start, end, expected } of testCases) {
        expect(await arrayUtilsTest.range(start, end)).to.deep.equal(expected);
      }
    });
  });

  describe('contains', function () {
    it('returns true if an array contains a value', async function () {
      const { arrayUtilsTest } = this;

      const testCases = [
        {
          array: [1, 2, 3, 4, 5],
          value: 3,
          expected: true,
        },
        {
          array: [1, 2, 3, 4, 5],
          value: 6,
          expected: false,
        },
        {
          array: [1, 2, 3, 4, 5],
          value: 1,
          expected: true,
        },
        {
          array: [1, 2, 3, 4, 5],
          value: 5,
          expected: true,
        },
      ];

      for (const { array, value, expected } of testCases) {
        expect(await arrayUtilsTest.contains(array, value)).to.equal(expected);
      }
    });
  });
});
