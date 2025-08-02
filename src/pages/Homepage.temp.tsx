// This is a temporary file with the updated container structure
// The key changes are in the container classes for better mobile display

// ... (previous imports remain the same)

// In the JSX, find this section (around line 1626-1627):
/* OLD:
        <div className="-mx-4 px-4 overflow-x-auto pb-4">
          <div className="flex space-x-4 md:space-x-8 w-max">
*/

// REPLACE WITH:
        <div className="w-full overflow-x-auto pb-4">
          <div className="flex space-x-4 md:space-x-8 px-4 w-max">

// The rest of the component remains the same

// Key changes made:
// 1. Changed the outer container to use `w-full` instead of negative margins
// 2. Moved the `px-4` padding to the inner flex container
// 3. Kept the `overflow-x-auto` for horizontal scrolling
// 4. Maintained the `w-max` on the flex container to allow content to determine width
