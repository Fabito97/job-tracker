
(() => {
  const jobs = [];
  const seen = new Set();

  // --------------------------------------------------
  // FIND LINKEDIN JOB CARDS
  // --------------------------------------------------
  const cards = document.querySelectorAll(
    '[componentkey^="job-card-component-ref-"], [data-occludable-job-id]'
  );

  console.log(`Found ${cards.length} job cards`);

  // --------------------------------------------------
  // HELPER: CLEAN TEXT
  // --------------------------------------------------
  const cleanText = value =>
    (value || '')
      .replace(/\s+/g, ' ')
      .trim();

  // --------------------------------------------------
  // HELPER: EXTRACT JOB URL
  // --------------------------------------------------
  function extractJobUrl(card) {
    let jobUrl = '';

    // 1. Look through ALL links in the card
    const links = [...card.querySelectorAll('a[href]')];

    for (const link of links) {
      const href = link.getAttribute('href') || '';

      // LinkedIn job URL
      if (
        href.includes('/jobs/view/') ||
        href.includes('/job/view/')
      ) {
        jobUrl = href;
        break;
      }
    }

    // 2. Sometimes the card itself contains a job ID
    if (!jobUrl) {
      const jobId =
        card.getAttribute('data-occludable-job-id') ||
        card.getAttribute('data-job-id');

      if (jobId) {
        jobUrl = `https://www.linkedin.com/jobs/view/${jobId}/`;
      }
    }

    // 3. Look for job ID in componentkey
    if (!jobUrl) {
      const componentKey = card.getAttribute('componentkey') || '';

      const match = componentKey.match(/job-card-component-ref-(\d+)/);

      if (match) {
        jobUrl = `https://www.linkedin.com/jobs/view/${match[1]}/`;
      }
    }

    // 4. Convert relative URL to absolute URL
    if (jobUrl) {
      try {
        const url = new URL(jobUrl, window.location.origin);

        // Remove LinkedIn tracking parameters
        url.search = '';
        url.hash = '';

        jobUrl = url.href;
      } catch (error) {
        console.warn('Could not normalize URL:', jobUrl);
      }
    }

    return jobUrl;
  }

  // --------------------------------------------------
  // PROCESS EACH JOB CARD
  // --------------------------------------------------
  cards.forEach((card, index) => {
    try {

      // ------------------------------------------------
      // JOB TITLE
      // ------------------------------------------------
      const titleEl =
        card.querySelector(
          '[data-testid="job-card-title"], ' +
          '.job-card-list__title, ' +
          '.artdeco-entity-lockup__title, ' +
          'a[href*="/jobs/view/"]'
        ) ||
        card.querySelector('span');

      const jobTitle = cleanText(titleEl?.innerText);

      // ------------------------------------------------
      // COMPANY
      // ------------------------------------------------
      const companyEl =
        card.querySelector(
          '.artdeco-entity-lockup__subtitle, ' +
          '.job-card-container__company-name'
        );

      let company = cleanText(companyEl?.innerText);

      // Fallback
      if (!company) {
        const textElements = [...card.querySelectorAll('p, span, div')]
          .map(el => cleanText(el.innerText))
          .filter(Boolean);

        const titleIndex = textElements.findIndex(
          text => text === jobTitle
        );

        if (titleIndex >= 0) {
          company = textElements[titleIndex + 1] || '';
        }
      }

      // ------------------------------------------------
      // LOCATION
      // ------------------------------------------------
      const locationEl =
        card.querySelector(
          '.artdeco-entity-lockup__caption, ' +
          '.job-card-container__metadata-item'
        );

      let location = cleanText(locationEl?.innerText);

      if (!location) {
        const textElements = [...card.querySelectorAll('p, span, div')]
          .map(el => cleanText(el.innerText))
          .filter(Boolean);

        location =
          textElements.find(text =>
            /,\s*[A-Z]{2}$/.test(text) ||
            /Remote/i.test(text)
          ) || '';
      }

      // ------------------------------------------------
      // DATE
      // ------------------------------------------------
      const datePatterns = [
        /Today/i,
        /Yesterday/i,
        /\d+\s+(minute|minutes|hour|hours|day|days|week|weeks)\s+ago/i,
        /Just posted/i
      ];

      const allText = [...card.querySelectorAll('p, span, div')]
        .map(el => cleanText(el.innerText))
        .filter(Boolean);

      let date = '';

      for (const text of allText) {
        if (datePatterns.some(pattern => pattern.test(text))) {
          date = text;
          break;
        }
      }

      // ------------------------------------------------
      // JOB DESCRIPTION
      // ------------------------------------------------
      let jobDescription = '';

      const descriptionEl =
        card.querySelector(
          '.job-card-list__description, ' +
          '.job-card-container__description'
        );

      if (descriptionEl) {

        jobDescription = cleanText(
          descriptionEl.innerText
        );

      } else {

        const cardText = card.innerText
          .split('\n')
          .map(x => cleanText(x))
          .filter(Boolean);

        const excluded = new Set([
          jobTitle,
          company,
          location,
          date
        ]);

        jobDescription = cardText
          .filter(text => !excluded.has(text))
          .join(' ')
          .trim();
      }

      // ------------------------------------------------
      // JOB URL
      // ------------------------------------------------
      const jobUrl = extractJobUrl(card);

      // ------------------------------------------------
      // VALIDATION
      // ------------------------------------------------
      if (!jobTitle || !company) {
        console.warn(
          `Skipping card ${index + 1}: missing title/company`
        );
        return;
      }

      // ------------------------------------------------
      // UNIQUE KEY
      // ------------------------------------------------
      const uniqueKey =
        jobUrl ||
        `${jobTitle}|${company}|${location}`;

      if (seen.has(uniqueKey)) {
        return;
      }

      seen.add(uniqueKey);

      // ------------------------------------------------
      // ADD JOB
      // ------------------------------------------------
      jobs.push({
        jobTitle,
        company,
        date,
        location,
        jobDescription,
        jobUrl
      });

    } catch (error) {

      console.warn(
        `Could not process job card ${index + 1}:`,
        error
      );

    }
  });

  // --------------------------------------------------
  // RESULTS
  // --------------------------------------------------
  console.log(`✅ Extracted ${jobs.length} jobs`);

  const urlsFound = jobs.filter(
    job => job.jobUrl
  ).length;

  console.log(
    `🔗 Job URLs found: ${urlsFound}/${jobs.length}`
  );

  // --------------------------------------------------
  // JSON
  // --------------------------------------------------
  const json = JSON.stringify(
    jobs,
    null,
    2
  );

  console.log(json);

  // --------------------------------------------------
  // COPY TO CLIPBOARD
  // --------------------------------------------------
  try {
    copy(json);
    console.log('📋 JSON copied to clipboard');
  } catch (error) {
    navigator.clipboard?.writeText(json);
  }

  // --------------------------------------------------
  // DOWNLOAD linkedin.json
  // --------------------------------------------------
  const blob = new Blob(
    [json],
    {
      type: 'application/json;charset=utf-8'
    }
  );

  const downloadUrl =
    URL.createObjectURL(blob);

  const downloadLink =
    document.createElement('a');

  downloadLink.href = downloadUrl;
  const timestamp =
        new Date()
            .toISOString()
            .replace(/[:.]/g, "-");

    downloadLink.download =
        `linkedin-jobs-${timestamp}.json`;

  document.body.appendChild(downloadLink);

  downloadLink.click();

  document.body.removeChild(downloadLink);

  URL.revokeObjectURL(downloadUrl);

  console.log(
    '💾 File downloaded: linkedin.json'
  );

  // --------------------------------------------------
  // RETURN DATA
  // --------------------------------------------------
  return jobs;

})();
