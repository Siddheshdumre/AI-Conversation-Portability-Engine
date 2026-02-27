const { fetchConversationWithMeta } = require("./lib/fetcher.js");

(async () => {
    try {
        console.log("Starting fetch...");
        const result = await fetchConversationWithMeta("https://chatgpt.com/share/699fe439-1d38-8002-8576-7602dee4350f");
        console.log("Success:", result.success);
        console.log("Is Demo:", result.isDemo);
        console.log("Messages Count:", result.messages ? result.messages.length : 0);
        if (!result.success && result.reason) {
            console.log("Reason:", result.reason);
        }
    } catch (e) {
        console.error("Test failed", e);
    }
})();
