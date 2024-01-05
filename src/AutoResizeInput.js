export function initializeAutoResizeInput() {
  const input = document.getElementById('input');
  const terminal = document.getElementById('terminal');
  const prefixes = document.querySelector('.input-prefixes');

  const updatePrefixes = () => {
    const lines = input.value.split('\n').length;
    prefixes.innerHTML = Array(lines).fill('&gt;').join('<br>');
  };

  const resizeInput = () => {
    // Temporarily disable the scrollbar to prevent flicker
    input.style.overflow = 'hidden';

    // Reset height to auto to get the new scroll height
    input.style.height = 'auto';
    const maxHeight = terminal.clientHeight * 0.5; // 50% of the terminal's height
    const newHeight = Math.min(input.scrollHeight, maxHeight);
    input.style.height = `${newHeight}px`;

    // Enable the scrollbar if the content exceeds 50% of the terminal's height
    if (input.scrollHeight > maxHeight) {
      input.style.overflow = 'auto';
    } else {
      input.style.overflow = 'hidden';
    }

    updatePrefixes();
  };

  const delayedResize = () => {
    setTimeout(resizeInput, 0); // Delay resizing to after the input value changes
  };

  // Event listeners
  input.addEventListener('input', resizeInput); // Handle text changes
  input.addEventListener('keydown', delayedResize); // Handle new lines and other key presses
  input.addEventListener('paste', delayedResize); // Handle pasted multi-line text
  input.addEventListener('change', updatePrefixes);

  // Initial resize for any pre-filled values
  resizeInput();
  updatePrefixes();
}
