document.getElementById('analyzeBtn').addEventListener('click', async () => {
    // 1. Rename the variable to 'currWindow' to avoid the collision
    const currWindow = await chrome.windows.getCurrent();
    
    // 2. Open the side panel
    await chrome.sidePanel.open({ windowId: currWindow.id });

    // 3. Now the global window.close() will work correctly
    window.close(); 
});