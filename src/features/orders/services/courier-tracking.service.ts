import https from "https";

export interface TrackingCheckpoint {
  date: string;
  status: string;
  location: string;
  isDelivered?: boolean;
}

export interface TrackingSummary {
  awb: string;
  currentStatus: string;
  origin?: string;
  destination?: string;
  consignment?: string;
  bookingDate?: string;
  deliveryDate?: string;
}

export interface TrackingResult {
  success: boolean;
  awb: string;
  courier: string;
  summary?: TrackingSummary;
  checkpoints: TrackingCheckpoint[];
  error?: string;
  officialUrl?: string;
}

/**
 * Fetch live tracking information directly from ST Courier's official endpoint.
 */
export async function fetchSTCourierTracking(awb: string): Promise<TrackingResult> {
  const cleanAwb = (awb || "").trim().replace(/[^0-9]/g, "");

  if (!cleanAwb || cleanAwb.length < 5) {
    return {
      success: false,
      awb: cleanAwb,
      courier: "ST Courier",
      checkpoints: [],
      error: "Invalid AWB number. Please check the tracking number.",
      officialUrl: "https://stcourier.com/track/shipment",
    };
  }

  return new Promise((resolve) => {
    const postData = `awb_no=${encodeURIComponent(cleanAwb)}`;
    const postReq = https.request(
      "https://stcourier.com/track/doCheck",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 10000,
      },
      (res) => {
        const cookies = res.headers["set-cookie"];
        if (!cookies || !cookies.length) {
          return resolve({
            success: false,
            awb: cleanAwb,
            courier: "ST Courier",
            checkpoints: [],
            error: "Unable to establish tracking session with ST Courier.",
            officialUrl: "https://stcourier.com/track/shipment",
          });
        }

        const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");

        let checkBody = "";
        res.on("data", (d) => (checkBody += d));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(checkBody);
            if (parsed.code && parsed.code !== 200) {
              return resolve({
                success: false,
                awb: cleanAwb,
                courier: "ST Courier",
                checkpoints: [],
                error: parsed.msg || "Shipment not found in ST Courier system.",
                officialUrl: "https://stcourier.com/track/shipment",
              });
            }
          } catch {
            // Ignore JSON parse errors if response is not JSON
          }

          // Fetch the rendered shipment tracking details using the session cookie
          const getReq = https.get(
            "https://stcourier.com/track/shipment",
            {
              headers: {
                Cookie: cookieHeader,
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
              timeout: 10000,
            },
            (res2) => {
              let html = "";
              res2.on("data", (d) => (html += d));
              res2.on("end", () => {
                const extractTableField = (labelPattern: string) => {
                  const regex = new RegExp(
                    '<td[^>]*>\\s*' +
                      labelPattern +
                      '\\s*<\\/td>\\s*<td[^>]*class="font-normal"[^>]*>([\\s\\S]*?)<\\/td>',
                    "i"
                  );
                  const match = html.match(regex);
                  return match
                    ? match[1]
                        .replace(/<[^>]+>/g, "")
                        .replace(/&nbsp;/gi, " ")
                        .trim()
                    : undefined;
                };

                const currentStatus =
                  extractTableField("Current Status") || "In Transit";
                const origin = extractTableField("Orgin SRC");
                const destination = extractTableField("Destination");
                const consignment = extractTableField("Consignment");
                const bookingDate = extractTableField("Book Date/Time");
                const deliveryDate = extractTableField("Delivery Date/Time");

                const summary: TrackingSummary = {
                  awb: cleanAwb,
                  currentStatus,
                  origin,
                  destination,
                  consignment,
                  bookingDate,
                  deliveryDate,
                };

                // Checkpoints parsing
                const checkpoints: TrackingCheckpoint[] = [];
                const parts = html.split(/tl29/i);
                for (let i = 1; i < parts.length; i++) {
                  const part = parts[i];
                  const textMatches = [
                    ...part.matchAll(
                      /style="margin-top:0;color:inherit;font-weight:400;">([\s\S]*?)<\/div>/gi
                    ),
                  ];
                  if (textMatches.length >= 2) {
                    const dateRaw = textMatches[0][1]
                      .replace(/<br\s*\/?>/gi, " ")
                      .replace(/&nbsp;/gi, " ")
                      .replace(/\s+/g, " ")
                      .trim();
                    const detailsRaw = textMatches[1][1]
                      .split(/<br\s*\/?>/gi)
                      .map((s) => s.replace(/&nbsp;/gi, " ").trim())
                      .filter(Boolean);
                    const status = detailsRaw[0] || "";
                    const location = detailsRaw.slice(1).join(", ") || "";
                    checkpoints.push({
                      date: dateRaw,
                      status,
                      location,
                      isDelivered: /delivered/i.test(status),
                    });
                  }
                }

                if (checkpoints.length === 0 && !origin && !deliveryDate) {
                  return resolve({
                    success: false,
                    awb: cleanAwb,
                    courier: "ST Courier",
                    checkpoints: [],
                    error:
                      "No tracking checkpoints available yet. The shipment may be awaiting initial scan.",
                    officialUrl: "https://stcourier.com/track/shipment",
                  });
                }

                resolve({
                  success: true,
                  awb: cleanAwb,
                  courier: "ST Courier",
                  summary,
                  checkpoints,
                  officialUrl: "https://stcourier.com/track/shipment",
                });
              });
            }
          );

          getReq.on("error", () => {
            resolve({
              success: false,
              awb: cleanAwb,
              courier: "ST Courier",
              checkpoints: [],
              error: "Failed to connect to ST Courier tracking servers.",
              officialUrl: "https://stcourier.com/track/shipment",
            });
          });
        });
      }
    );

    postReq.on("error", () => {
      resolve({
        success: false,
        awb: cleanAwb,
        courier: "ST Courier",
        checkpoints: [],
        error: "Failed to connect to ST Courier tracking servers.",
        officialUrl: "https://stcourier.com/track/shipment",
      });
    });

    postReq.write(postData);
    postReq.end();
  });
}
