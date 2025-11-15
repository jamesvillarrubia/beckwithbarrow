/**
 * Format number for display, replacing zeros with capital letter O
 * 
 * @param num - The number to format
 * @param padLength - Optional padding length (default: 2)
 * @returns Formatted string with zeros replaced by 'O'
 * 
 * @example
 * formatNumberWithO(1) // returns "O1"
 * formatNumberWithO(10) // returns "1O"
 * formatNumberWithO(5) // returns "O5"
 * formatNumberWithO(123, 3) // returns "123"
 */
export function formatNumberWithO(num: number, padLength: number = 2): string {
  // Pad the number with leading zeros
  const paddedNumber = num.toString().padStart(padLength, '0');
  
  // Replace all zeros with capital letter O
  return paddedNumber.replace(/0/g, 'O');
}

