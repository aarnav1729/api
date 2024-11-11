// utils/allocateTrucks.js
const Quote = require('../models/Quote');

async function allocateTrucksBasedOnPrice(rfqId) {
  try {
    const rfq = await RFQ.findById(rfqId);
    const requiredTrucks = rfq.numberOfVehicles;

    if (!requiredTrucks || requiredTrucks <= 0) {
      console.error("Invalid required trucks");
      return;
    }

    let quotes = await Quote.find({ rfqId });

    // Sort the quotes with the enhanced logic
    quotes.sort((a, b) => {
      if (a.price !== b.price) {
        return a.price - b.price; // Ascending price
      } else {
        return new Date(a.createdAt) - new Date(b.createdAt); // Earlier bids first
      }
    });

    let totalTrucks = 0;
    let i = 0;
    let labelCounter = 1;

    while (i < quotes.length && totalTrucks < requiredTrucks) {
      const currentPrice = quotes[i].price;
      const samePriceQuotes = [];

      // Collect all quotes with the same price
      while (i < quotes.length && quotes[i].price === currentPrice) {
        samePriceQuotes.push(quotes[i]);
        i++;
      }

      // Assign the same label to all vendors with the same price
      const label = `L${labelCounter}`;

      // Calculate total trucks offered by vendors at this price
      const totalOfferedTrucks = samePriceQuotes.reduce(
        (sum, q) => sum + q.numberOfTrucks,
        0
      );

      // Calculate remaining trucks to allocate
      const remainingTrucks = requiredTrucks - totalTrucks;

      // Maximum trucks that can be allocated in this group
      const maxAllocatableTrucks = Math.min(
        totalOfferedTrucks,
        remainingTrucks
      );

      // Allocate trucks proportionally based on trucks offered
      let groupTotalAllocated = 0;
      const allocation = [];

      for (const quote of samePriceQuotes) {
        const maxPossible = quote.numberOfTrucks;
        const proportion = maxPossible / totalOfferedTrucks;
        let trucksToAllot = Math.floor(proportion * maxAllocatableTrucks);

        // Ensure we don't allocate more than offered
        trucksToAllot = Math.min(trucksToAllot, maxPossible);

        groupTotalAllocated += trucksToAllot;

        allocation.push({
          quoteId: quote._id,
          label,
          trucksAllotted: trucksToAllot,
          createdAt: quote.createdAt,
          numberOfTrucks: quote.numberOfTrucks,
        });
      }

      // Distribute any remaining trucks within the group
      let trucksRemainingToAllocate =
        maxAllocatableTrucks - groupTotalAllocated;

      if (trucksRemainingToAllocate > 0) {
        // Assign to vendors who can take more trucks, starting from earliest bidder
        allocation
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          .forEach((alloc) => {
            const maxAdditionalTrucks =
              alloc.numberOfTrucks - alloc.trucksAllotted;
            if (maxAdditionalTrucks > 0 && trucksRemainingToAllocate > 0) {
              const additionalTrucks = Math.min(
                maxAdditionalTrucks,
                trucksRemainingToAllocate
              );
              alloc.trucksAllotted += additionalTrucks;
              trucksRemainingToAllocate -= additionalTrucks;
              groupTotalAllocated += additionalTrucks;
            }
          });
      }

      totalTrucks += groupTotalAllocated;

      // Update the quotes in the database
      for (const alloc of allocation) {
        await Quote.findByIdAndUpdate(alloc.quoteId, {
          label: alloc.label,
          trucksAllotted: alloc.trucksAllotted,
        });
      }

      labelCounter++;
    }

    // For any remaining vendors, set label to "-" and trucksAllotted to 0
    while (i < quotes.length) {
      const quote = quotes[i];
      await Quote.findByIdAndUpdate(quote._id, {
        label: "-",
        trucksAllotted: 0,
      });
      i++;
    }
  } catch (error) {
    console.error("Error allocating trucks:", error);
  }
}

module.exports = allocateTrucksBasedOnPrice;