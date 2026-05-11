const numberInput = document.getElementById('numberInput');
const computeButton = document.getElementById('computeButton');
const output = document.getElementById('output');

function computeSquareAndMessage(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return { message: 'Please enter a valid number.', value: null };
  }
  const square = number * number;
  return {
    message: `The square of ${number} is ${square}.`,
    value: square,
  };
}

computeButton.addEventListener('click', () => {
  const result = computeSquareAndMessage(numberInput.value);
  output.textContent = result.message;
  output.classList.toggle('error', result.value === null);
});
