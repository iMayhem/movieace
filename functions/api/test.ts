export const onRequest = async (context) => {
  const testUrl = "https://cacdn.hakunaymatata.com/subtitle/b8bccfece2af6aee165fee39ea1298e5.srt?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9jYWNkbi5oYWt1bmF5bWF0YXRhLmNvbS9zdWJ0aXRsZS8qIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzgwMDYwMTM4fX19XX0_&Signature=iZTIhIEW3aW5ZGtfijGWibh9Q8Cgj3GF5y0JUQBcylSqRdlmqfhuEKd3ee1LzRB2AhztKkON6PAGMjCb-HlSvdg1Kbz2sMGZlsR-GmZvHyFYYWQ9z3wd8RPySP547Wq~ZhIUy8DwmhpNYmbcRTUABiLwKQdyrXWADm75-aIjS3npBQ3JZj8O~SEclM0ccYtrBgcSR9l9HGXGmfWQbMAmbQia~INnGNkixvD~-kwb773MpFQ55Pe~jOYRFznYFG0dAV3Rm5k0T5P1SQXLnSz1~CJLPuBGiHObR~s4BIYbaS7x6bBCK1PU82rUVOR8zAYfxnakcDumgnXhapf0NkkzOA__&Key-Pair-Id=KMHN1LQ1HEUPL";

  try {
    const res = await fetch(testUrl, {
      method: "GET",
      headers: {
        "Referer": "https://moviebox.pk",
        "Origin": "https://moviebox.pk",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    return new Response(JSON.stringify({
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries())
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
