export function calculateHouseholdTotal(
  members: { membershipType: string }[],
  prices: Record<string, number>
) {
  const manuallySelectedFamily = members.some((m) => m.membershipType === 'Family');
  const familyCost = prices['Family'] ?? 200;
  
  const numAdults = members.filter(m => m.membershipType === 'Adult').length;
  const numJuniors = members.filter(m => m.membershipType === 'Junior').length;
  const numSeniors = members.filter(m => m.membershipType === 'Senior').length;
  
  // Total count of adults including the person who selected Family (if any)
  const effectiveNumAdults = manuallySelectedFamily ? numAdults + 1 : numAdults;
  
  // Rule: Family applies if manually selected OR (2+ Adults AND 1+ Juniors)
  const showFamilyDiscount = manuallySelectedFamily || (effectiveNumAdults >= 2 && numJuniors >= 1);
  
  let totalDue = 0;
  const coveredIndexes = new Set<number>();
  
  if (showFamilyDiscount) {
    totalDue += familyCost;
    
    // We cover up to 2 Adults and up to 2 Juniors.
    const extraAdults = Math.max(0, effectiveNumAdults - 2);
    const extraJuniors = Math.max(0, numJuniors - 2);
    
    totalDue += extraAdults * (prices['Adult'] ?? 85);
    totalDue += extraJuniors * (prices['Extra Junior'] ?? 25);
    totalDue += numSeniors * (prices['Senior'] ?? 70);
    
    // Add prices for any other types just in case (including explicit 'Extra Junior')
    totalDue += members
      .filter(m => !['Adult', 'Junior', 'Senior', 'Family'].includes(m.membershipType))
      .reduce((sum, m) => sum + (prices[m.membershipType] ?? 0), 0);
      
    // Determine which specific members are covered by the Family discount so we can cross out their individual prices
    let adultCount = 0;
    let juniorCount = 0;
    
    members.forEach((m, i) => {
      if (m.membershipType === 'Family') {
        adultCount++;
        coveredIndexes.add(i);
      } else if (m.membershipType === 'Adult') {
        if (adultCount < 2) {
          adultCount++;
          coveredIndexes.add(i);
        }
      } else if (m.membershipType === 'Junior') {
        if (juniorCount < 2) {
          juniorCount++;
          coveredIndexes.add(i);
        }
      }
    });
  } else {
    totalDue = members.reduce((sum, m) => sum + (prices[m.membershipType] ?? 0), 0);
  }
  
  return { totalDue, coveredIndexes, showFamilyDiscount };
}
