(async () => {
    /*
     * Dice Job Extractor
     *
     * Run directly in the browser console on a Dice
     * job-search results page.
     *
     * Extracts:
     *   - Job Title
     *   - Company
     *   - Date
     *   - Location
     *   - Job Description
     *   - Job Description URL
     *
     * Exports:
     *   - JSON file
     */

    const sleep = (ms) =>
        new Promise(resolve => setTimeout(resolve, ms));

    const randomDelay = (min = 3000, max = 8000) => {
        const delay = Math.floor(
            Math.random() * (max - min + 1) + min
        );

        console.log(
            `Waiting ${(delay / 1000).toFixed(1)} seconds before next request...`
        );

        return sleep(delay);
    };

    const cleanText = (text) => {
        return (text || "")
            .replace(/\s+/g, " ")
            .replace(/<!--.*?-->/g, "")
            .trim();
    };

    // --------------------------------------------------
    // GET JOB CARDS
    // --------------------------------------------------

    const cards = [
        ...document.querySelectorAll('[data-testid="job-card"]')
    ];

    console.log(`Found ${cards.length} job cards.`);

    if (!cards.length) {
        console.warn(
            "No job cards found. Make sure you are on the Dice job search results page."
        );
        return;
    }

    const jobs = [];

    // --------------------------------------------------
    // PROCESS EACH JOB
    // --------------------------------------------------

    for (let i = 0; i < cards.length; i++) {

        const card = cards[i];

        try {

            // ------------------------------------------
            // JOB TITLE
            // ------------------------------------------

            const titleElement = card.querySelector(
                '[data-testid="job-search-job-detail-link"]'
            );

            const jobTitle = cleanText(
                titleElement?.textContent
            );

            // ------------------------------------------
            // COMPANY
            // ------------------------------------------

            const companyElement = card.querySelector(
                '[data-testid="job-card-company-name"]'
            );

            const company = cleanText(
                companyElement?.textContent
            );

            // ------------------------------------------
            // LOCATION + DATE
            // ------------------------------------------

            const locationDateElement = [
                ...card.querySelectorAll("p")
            ].find(p => {
                const text = cleanText(p.textContent);
                return text.includes(" • ");
            });

            const locationDate = cleanText(
                locationDateElement?.textContent
            );

            let location = "";
            let date = "";

            if (locationDate.includes(" • ")) {

                const parts = locationDate.split(" • ");

                location = cleanText(parts[0]);

                date = cleanText(
                    parts.slice(1).join(" • ")
                );
            }

            // ------------------------------------------
            // JOB URL
            // ------------------------------------------

            const relativeUrl =
                titleElement?.getAttribute("href");

            const jobUrl = relativeUrl
                ? new URL(
                    relativeUrl,
                    window.location.origin
                ).href
                : "";

            // ------------------------------------------
            // JOB DESCRIPTION
            // ------------------------------------------

            let jobDescription = "";

            if (jobUrl) {

                console.log(
                    `\n[${i + 1}/${cards.length}] ${jobTitle}`
                );

                console.log(
                    `Fetching: ${jobUrl}`
                );

                // Random delay between requests
                await randomDelay(3000, 8000);

                try {

                    const response = await fetch(
                        jobUrl,
                        {
                            credentials: "include"
                        }
                    );

                    if (!response.ok) {
                        throw new Error(
                            `HTTP ${response.status}`
                        );
                    }

                    const html =
                        await response.text();

                    // ----------------------------------
                    // PARSE HTML
                    // ----------------------------------

                    const parser =
                        new DOMParser();

                    const detailDocument =
                        parser.parseFromString(
                            html,
                            "text/html"
                        );

                    // ----------------------------------
                    // DESCRIPTION SELECTORS
                    // ----------------------------------

                    const descriptionSelectors = [

                        '[data-testid="job-description"]',

                        '[data-testid="job-detail-description"]',

                        '[data-testid="job-description-text"]',

                        '.job-description',

                        '#job-description',

                        '[class*="job-description"]'

                    ];

                    let descriptionElement = null;

                    for (
                        const selector
                        of descriptionSelectors
                    ) {

                        descriptionElement =
                            detailDocument.querySelector(
                                selector
                            );

                        if (descriptionElement) {
                            break;
                        }
                    }

                    // ----------------------------------
                    // PRIMARY EXTRACTION
                    // ----------------------------------

                    if (descriptionElement) {

                        jobDescription =
                            cleanText(
                                descriptionElement.innerText ||
                                descriptionElement.textContent
                            );
                    }

                    // ----------------------------------
                    // FALLBACK EXTRACTION
                    // ----------------------------------

                    if (!jobDescription) {

                        const elements = [
                            ...detailDocument.querySelectorAll(
                                "div, section, article"
                            )
                        ];

                        const descriptionContainer =
                            elements.find(el => {

                                const text =
                                    cleanText(
                                        el.innerText
                                    );

                                return (
                                    text.length > 300 &&
                                    (
                                        text.includes(
                                            "Job Description"
                                        ) ||
                                        text.includes(
                                            "Job Overview"
                                        ) ||
                                        text.includes(
                                            "Responsibilities"
                                        ) ||
                                        text.includes(
                                            "Required Skills"
                                        )
                                    )
                                );
                            });

                        if (descriptionContainer) {

                            jobDescription =
                                cleanText(
                                    descriptionContainer.innerText
                                );
                        }
                    }

                    console.log(
                        `Description extracted: ${jobDescription.length} characters`
                    );

                } catch (error) {

                    console.warn(
                        `Could not fetch description for "${jobTitle}":`,
                        error
                    );
                }
            }

            // ------------------------------------------
            // STORE JOB
            // ------------------------------------------

            jobs.push({

                jobTitle,

                company,

                date,

                location,

                jobDescription,

                jobUrl

            });

        } catch (error) {

            console.error(
                `Error processing job ${i + 1}:`,
                error
            );
        }
    }

    // --------------------------------------------------
    // SAVE GLOBALLY
    // --------------------------------------------------

    window.diceJobs = jobs;

    // --------------------------------------------------
    // DISPLAY SUMMARY
    // --------------------------------------------------

    console.log(
        "\n========================================"
    );

    console.log(
        "JOB EXTRACTION COMPLETE"
    );

    console.log(
        "========================================"
    );

    console.table(
        jobs.map((job, index) => ({

            "#": index + 1,

            "Job Title": job.jobTitle,

            "Company": job.company,

            "Location": job.location,

            "Date": job.date,

            "Description Characters":
                job.jobDescription.length,

            "Job URL": job.jobUrl

        }))
    );

    // --------------------------------------------------
    // DISPLAY FULL DESCRIPTIONS
    // --------------------------------------------------

    jobs.forEach((job, index) => {

        console.log(
            `\n\n========== JOB ${index + 1} ==========`
        );

        console.log(
            "Job Title:",
            job.jobTitle
        );

        console.log(
            "Company:",
            job.company
        );

        console.log(
            "Location:",
            job.location
        );

        console.log(
            "Date:",
            job.date
        );

        console.log(
            "Job URL:",
            job.jobUrl
        );

        console.log(
            "Job Description:"
        );

        console.log(
            job.jobDescription
        );
    });

    // --------------------------------------------------
    // CREATE JSON
    // --------------------------------------------------

    const json = JSON.stringify(
        jobs,
        null,
        2
    );

    // --------------------------------------------------
    // DOWNLOAD JSON FILE
    // --------------------------------------------------

    const blob = new Blob(
        [json],
        {
            type: "application/json"
        }
    );

    const downloadUrl =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = downloadUrl;

    // Example:
    // dice-jobs-2026-08-18.json

    const timestamp =
        new Date()
            .toISOString()
            .replace(/[:.]/g, "-");

    a.download =
        `dice-jobs-${timestamp}.json`;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(
        downloadUrl
    );

    // --------------------------------------------------
    // COPY JSON TO CLIPBOARD
    // --------------------------------------------------

    try {

        await navigator.clipboard.writeText(
            json
        );

        console.log(
            "JSON also copied to clipboard."
        );

    } catch (error) {

        console.warn(
            "Could not copy JSON to clipboard."
        );
    }

    // --------------------------------------------------
    // FINAL MESSAGE
    // --------------------------------------------------

    console.log(
        `\nExtracted ${jobs.length} jobs.`
    );

    console.log(
        "Full data available as: window.diceJobs"
    );

    console.log(
        "JSON file downloaded successfully."
    );

    return jobs;

})();

