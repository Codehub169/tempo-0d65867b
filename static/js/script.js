document.addEventListener('DOMContentLoaded', () => {
    const startupIdeaInput = document.getElementById('startup-idea');
    const analyzeButton = document.getElementById('analyze-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageDiv = document.getElementById('error-message');
    const resultsSection = document.getElementById('results-section');

    // Result display elements
    const swotAnalysisContent = document.getElementById('swot-analysis-content');
    const marketFitContent = document.getElementById('market-fit-content');
    const competitorOverviewContent = document.getElementById('competitor-overview-content');
    const refinementSuggestionsContent = document.getElementById('refinement-suggestions-content');

    analyzeButton.addEventListener('click', async () => {
        const ideaText = startupIdeaInput.value.trim();

        if (!ideaText) {
            displayError('Please enter your startup idea.');
            return;
        }

        // Clear previous results and errors, show loading
        hideError();
        resultsSection.style.display = 'none';
        clearResults();
        loadingIndicator.style.display = 'block';

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idea: ideaText }),
            });

            loadingIndicator.style.display = 'none';

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred while parsing error response.' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                displayError(data.error);
            } else if (data.ai_response) {
                displayAnalysisResults(data.ai_response);
                resultsSection.style.display = 'block';
            } else {
                displayError('Received an unexpected response from the server.');
            }

        } catch (error) {
            loadingIndicator.style.display = 'none';
            displayError(`An error occurred: ${error.message}`);
            console.error('Error during analysis:', error);
        }
    });

    function displayError(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
        resultsSection.style.display = 'none'; // Ensure results are hidden on error
    }

    function hideError() {
        errorMessageDiv.style.display = 'none';
        errorMessageDiv.textContent = '';
    }

    function clearResults() {
        swotAnalysisContent.innerHTML = '';
        marketFitContent.innerHTML = '';
        competitorOverviewContent.innerHTML = '';
        refinementSuggestionsContent.innerHTML = '';
    }

    function displayAnalysisResults(responseText) {
        // Parse and display SWOT Analysis
        const swotText = extractSection(responseText, "**SWOT Analysis:**", "**Market Fit:**");
        swotAnalysisContent.innerHTML = parseSwotToHtml(swotText);

        // Parse and display Market Fit
        const marketFitText = extractSection(responseText, "**Market Fit:**", "**Competitor Overview:**");
        marketFitContent.innerHTML = formatTextToHtml(marketFitText);

        // Parse and display Competitor Overview
        const competitorText = extractSection(responseText, "**Competitor Overview:**", "**Refinement Suggestions:**");
        competitorOverviewContent.innerHTML = parseListToHtml(competitorText);

        // Parse and display Refinement Suggestions
        const suggestionsText = extractSection(responseText, "**Refinement Suggestions:**", null);
        refinementSuggestionsContent.innerHTML = parseListToHtml(suggestionsText);
    }

    function extractSection(text, startMarker, endMarker) {
        let startIndex = text.indexOf(startMarker);
        if (startIndex === -1) return "Content for this section was not found in the AI response.";
        startIndex += startMarker.length;

        let endIndex = -1;
        if (endMarker) {
            endIndex = text.indexOf(endMarker, startIndex);
        }

        const sectionText = (endIndex === -1) ? text.substring(startIndex).trim() : text.substring(startIndex, endIndex).trim();
        return sectionText || "Content for this section appears to be empty.";
    }
    
    function formatTextToHtml(text) {
        if (!text || text.toLowerCase().includes('not found') || text.toLowerCase().includes('empty')) return `<p>${text}</p>`;
        // Replace multiple newlines with single <br> and then wrap paragraphs
        // Handles paragraphs separated by one or more newlines
        return text.split(/\n\s*\n+/).map(paragraph => 
            `<p>${paragraph.split('\n').join('<br>')}</p>`
        ).join('');
    }

    function parseListToHtml(textBlock) {
        if (!textBlock || textBlock.toLowerCase().includes('not found') || textBlock.toLowerCase().includes('empty')) return `<p>${textBlock}</p>`;
        const lines = textBlock.split('\n').map(line => line.trim()).filter(line => line.startsWith('- ') || line.startsWith('* '));
        
        if (lines.length === 0) { // If no list items, treat as plain text paragraphs
             return formatTextToHtml(textBlock);
        }

        let html = '<ul>';
        lines.forEach(line => {
            html += `<li>${line.substring(2).trim()}</li>`; // Remove '- ' or '* '
        });
        html += '</ul>';
        return html;
    }

    function parseSwotToHtml(swotBlock) {
        if (!swotBlock || swotBlock.toLowerCase().includes('not found') || swotBlock.toLowerCase().includes('empty')) return `<p>${swotBlock}</p>`;
        let html = '';

        const swotSections = {
            'Strengths': { start: "**Strengths:**", end: "**Weaknesses:**" },
            'Weaknesses': { start: "**Weaknesses:**", end: "**Opportunities:**" },
            'Opportunities': { start: "**Opportunities:**", end: "**Threats:**" },
            'Threats': { start: "**Threats:**", end: null } // End is null for the last sub-section
        };

        for (const sectionName in swotSections) {
            const { start, end } = swotSections[sectionName];
            let sectionContent = extractSection(swotBlock, start, end);
            
            html += `<strong>${sectionName}:</strong>`;
            if (sectionContent.toLowerCase().includes('not found') || sectionContent.toLowerCase().includes('empty')) {
                 html += `<p>${sectionContent}</p>`;
            } else {
                // Check if it contains list items
                const listItems = sectionContent.split('\n').map(line => line.trim()).filter(line => line.startsWith('- ') || line.startsWith('* '));
                if (listItems.length > 0) {
                    html += '<ul>';
                    listItems.forEach(item => {
                        html += `<li>${item.substring(2).trim()}</li>`;
                    });
                    html += '</ul>';
                } else {
                    // If no list items, format as plain text (paragraphs)
                    html += formatTextToHtml(sectionContent);
                }
            }
        }
        return html;
    }
});
