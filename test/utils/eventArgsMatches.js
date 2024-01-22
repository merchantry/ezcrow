const { expect } = require('chai');

const listingStruct = listing => listingStruct => {
  Object.keys(listing).forEach(key => {
    expect(
      listing[key],
      `listing ${key}: ${listingStruct[key]} does not match ${listing[key]}`
    ).to.equal(listingStruct[key]);
  });

  return true;
};

const orderStruct = order => orderStruct => {
  Object.keys(order).forEach(key => {
    if (key === 'statusHistory') {
      order.statusHistory.forEach((status, i) => {
        expect(
          status,
          `order status ${i}: ${status} does not match ${orderStruct.statusHistory[i]}`
        ).to.equal(orderStruct.statusHistory[i]);
      });

      expect(order.statusHistory).to.have.lengthOf(
        orderStruct.statusHistory.length
      );

      return;
    }

    expect(
      order[key],
      `order ${key}: ${orderStruct[key]} does not match ${order[key]}`
    ).to.equal(orderStruct[key]);
  });

  return true;
};

module.exports = {
  listingStruct,
  orderStruct,
};
