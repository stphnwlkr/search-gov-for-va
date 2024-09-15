document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById("searchForm");
    const resultsContainer = document.getElementById("results");
    const resultsSummary = document.getElementById("results-summary");
    const paginationContainer = document.getElementById("pagination");
    const facetsContainer = document.getElementById("facetFilters");
    const filterSelectionsContainer = document.getElementById("filterSelections");
    const loadingMessage = document.getElementById("loadingMessage");
    const mimeTypes = {
        'application/pdf': 'PDF',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
        'application/vnd.ms-excel': 'Excel',
        'text/plain':'Text',
        // Add more MIME types as needed
    };

    facetsContainer.classList.add('facets');

    let selectedFacets = {
        tags: [],
        searchgov_custom2: [],  // Updated to include searchgov_custom2
        updated_until: null,
        updated_since: null,
    };

    function initializeFacetsFromURL() {
        const params = new URLSearchParams(window.location.search);

        const tags = params.get('tags');
        const custom2 = params.get('searchgov_custom2');  // Updated to handle searchgov_custom2
        const updatedUntil = params.get('updated_until');
        const updatedSince = params.get('updated_since');

        if (tags) {
            selectedFacets.tags = tags.split(',').map(decodeURIComponent);
        }

        if (custom2) {  // Updated to set the custom2 facet
            selectedFacets.searchgov_custom2 = custom2.split(',');
        }

        if (updatedUntil && updatedSince) {
            selectedFacets.updated_until = updatedUntil;
            selectedFacets.updated_since = updatedSince;
        }
    }

    function performSearch(clearFacets = false, resetPage = false) {
        loadingMessage.style.display = 'flex';
        
        if (clearFacets) {
            selectedFacets = {
                tags: [],
                searchgov_custom2: [],
                updated_until: null,
                updated_since: null,
            };
        }
    
        const params = new URLSearchParams(window.location.search);
        let query = document.getElementById("searchQuery").value || params.get('query') || '';
        let page = resetPage ? 1 : params.get('page') || 1;
    
        // Decode query if already encoded
        query = decodeURIComponent(query);
    
        // Check if the query contains spaces, which indicates a phrase
        const isPhrase = query.includes(' ') && !(query.startsWith('"') && query.endsWith('"'));
    
        // Save the query for the API with quotes if it's a phrase
        const apiQuery = isPhrase ? `"${query}"` : query;
    
        // Do not encode the query for the URL to prevent double encoding
        params.set('query', query);
        params.set('page', page);
    
        if (selectedFacets.tags.length > 0) {
            params.set('tags', selectedFacets.tags.join(','));
        } else {
            params.delete('tags');
        }
    
        if (selectedFacets.searchgov_custom2.length > 0) {
            params.set('searchgov_custom2', selectedFacets.searchgov_custom2.join(','));
        } else {
            params.delete('searchgov_custom2');
        }
    
        if (selectedFacets.updated_until && selectedFacets.updated_since) {
            params.set('updated_until', selectedFacets.updated_until);
            params.set('updated_since', selectedFacets.updated_since);
        } else {
            params.delete('updated_until');
            params.delete('updated_since');
        }
    
        // Update the browser's URL without re-encoding
        window.history.replaceState({}, '', `${location.pathname}?${params.toString()}`);
    
        // Prepare the data for the API request
        const data = new FormData();
        data.append('action', 'search_gov_for_va');
        data.append('query', apiQuery);  // Send the query with quotes for phrases if applicable
        data.append('page', page);
    
        selectedFacets.tags.forEach(tag => data.append('tags[]', tag));
        selectedFacets.searchgov_custom2.forEach(type => data.append('searchgov_custom2[]', type));
    
        if (selectedFacets.updated_until && selectedFacets.updated_since) {
            data.append('updated_until', selectedFacets.updated_until);
            data.append('updated_since', selectedFacets.updated_since);
        }
    
        fetch(SearchGovForVA.ajax_url, {
            method: 'POST',
            body: data,
        })
        .then(response => response.json())
        .then(response => {
            loadingMessage.style.display = 'none';
    
            if (response.success && response.data) {
                const data = response.data;
                const totalResults = data.total || 0;
    
                if (totalResults > 0) {
                    displayResults(data.results, query, totalResults, page);
                    populateFacets(data.aggregations || []);
                    renderPagination(totalResults, parseInt(page));
                    renderFilterSelections();
    
                    // Scroll to the top of the page smoothly
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
    
                    // Update screen reader announcement with result details
                    const resultsPerPage = 20;
                    const startRange = (page - 1) * resultsPerPage + 1;
                    const endRange = Math.min(page * resultsPerPage, totalResults);
                    
                    resultsSummary.setAttribute('aria-live', 'polite');
                    resultsSummary.textContent = `Showing ${startRange}-${endRange} of ${totalResults} results for "${query}". Page ${page} of ${Math.ceil(totalResults / resultsPerPage)}`;
                    
                    resultsContainer.focus();  // Set focus back to the results container
                } else {
                    resultsSummary.setAttribute('aria-live', 'polite');
                    resultsSummary.textContent = `Your search for "${query}" returned no results.`;
                    resultsContainer.innerHTML = '';
                    facetsContainer.innerHTML = '';
                    paginationContainer.innerHTML = '';
                }
            } else {
                resultsSummary.setAttribute('aria-live', 'polite');
                resultsSummary.textContent = `Your search for "${query}" returned no results.`;
            }
        })
        .catch(error => {
            loadingMessage.style.display = 'none';
            console.error('Error fetching results:', error);
            resultsSummary.textContent = `There was an error processing your search for "${query}". Please try again.`;
        });
    }
    
    function displayResults(results, query, totalResults, currentPage) {
        resultsContainer.innerHTML = '';

        const resultsPerPage = 20;
        const startRange = (currentPage - 1) * resultsPerPage + 1;
        const endRange = Math.min(currentPage * resultsPerPage, totalResults);

        const resultText = `<h1>Search Results for: ${query}</h1><h2>Showing ${startRange}-${endRange} of ${totalResults} results</h2>`;
        resultsSummary.innerHTML = resultText;

        document.title = `${totalResults} Search Results for "${query}"`;

        let output = '<ul class="results__list">';
        results.forEach(function (result) {
            const snippet = result.snippet ? result.snippet.replace(/[\uE000-\uE001]/g, match => match === '\uE000' ? '<span class="result__highlighter">' : '</span>') : '';
            const title = result.title.replace(/[\uE000-\uE001]/g, match => match === '\uE000' ? '<span class="result__highlighter">' : '</span>');
            
            // Check the MIME type in the mimeTypes object
            const mimeLabel = mimeTypes[result.mime_type] ? mimeTypes[result.mime_type] : ''; // Default to empty string if no match
            const fileIndicator = mimeLabel ? `<span class="result__file">${mimeLabel}</span>` : '';
            const downloadAttr = mimeLabel ? `download="${result.title}"` : '';

    output += `<li class="results__item">
    <div class="result">
        <div class="result__content">
            <div class="result__title-wrapper">
                <h3 class="result__title"><a href="${result.url}" ${downloadAttr}>${title}${fileIndicator}</a></h3>
                <p class="result__lede">${snippet}</p>
                <p class="result__url"><span>${result.url}</span></p> 
            </div>
            <div class="result__meta"> <!-- Wrapped in result__meta div -->
                ${result.searchgov_custom2 ? `<p class="result__type" data-content-type="${result.searchgov_custom2}">${result.searchgov_custom2}</p>` : ''}
                ${result.searchgov_custom1 ? `<p class="result__reading-time">${result.searchgov_custom1}</p>` : ''}
            </div>
           
        </div>
        
    </div>`;
    
    if (result.thumbnail_url) {
        output += `<div class="result__media-wrapper"><figure class="result__media"><img src="${result.thumbnail_url}" alt=""></figure></div>`;
    }
    output += `</div></li>`;
});
output += '</ul>';
    
        resultsContainer.innerHTML = output;
    }

    function populateFacets(aggregations) {
        facetsContainer.innerHTML = '';

        if (!aggregations || aggregations.length === 0) {
            console.error('No facets available to render.');
            return;
        }

        aggregations.forEach(agg => {
            Object.keys(agg).forEach(aggKey => {
                const aggregation = agg[aggKey];

                if (aggKey === 'tags' && Array.isArray(aggregation)) {
                    renderCheckboxGroup('Tags', aggregation, 'tags');
                } else if (aggKey === 'searchgov_custom2' && Array.isArray(aggregation)) { // New facet 'Content Type'
                    renderCheckboxGroup('Content Type', aggregation, 'searchgov_custom2');
                } else if (aggKey === 'changed' && Array.isArray(aggregation)) {
                    renderRadioGroup('Updated', aggregation, 'changed');
                }
            });
        });

        const applyFilterButton = document.createElement('button');
        applyFilterButton.id = 'applyFiltersButton';
        applyFilterButton.textContent = 'Apply Filters';
        applyFilterButton.addEventListener('click', function () {
            performSearch(false, true);
        });
        facetsContainer.appendChild(applyFilterButton);
    }

    function renderRadioGroup(title, facetArray, key) {
        const facetDiv = document.createElement('div');
        facetDiv.classList.add(`facets__facet-${key}`); // Add the class to the facet group
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        facetDiv.appendChild(titleElement);

        facetArray.forEach(facet => {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = key;
            input.value = `${facet.from_as_string} to ${facet.to_as_string}`;

            input.checked = selectedFacets[key] === input.value;
            input.addEventListener('change', () => {
                selectedFacets[key] = input.value;

                if (key === 'changed') {
                    selectedFacets.updated_until = facet.to_as_string;
                    selectedFacets.updated_since = facet.from_as_string;
                }
            });

            label.appendChild(input);
            label.appendChild(document.createTextNode(`${facet.agg_key} (${facet.doc_count})`));
            facetDiv.appendChild(label);
        });

        facetsContainer.appendChild(facetDiv);
    }

    function renderCheckboxGroup(title, facetArray, key) {
        const facetDiv = document.createElement('div');
        facetDiv.classList.add(`facets__facet-${key}`); // Add the class to the facet group
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        facetDiv.appendChild(titleElement);

        facetArray.forEach(facet => {
            if (facet.agg_key.startsWith('#')) return; // Exclude tags starting with #

            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.name = key;
            input.value = facet.agg_key;

            input.checked = selectedFacets[key].includes(facet.agg_key);
            input.addEventListener('change', () => {
                if (input.checked) {
                    selectedFacets[key].push(input.value);
                } else {
                    selectedFacets[key] = selectedFacets[key].filter(tag => tag !== input.value);
                }
            });

            label.appendChild(input);
            label.appendChild(document.createTextNode(`${facet.agg_key} (${facet.doc_count})`));
            facetDiv.appendChild(label);
        });

        facetsContainer.appendChild(facetDiv);
    }

    function renderPagination(totalResults, currentPage) {
        const resultsPerPage = 20;
        const totalPages = Math.ceil(totalResults / resultsPerPage);
        const paginationContainer = document.getElementById('pagination');
    
        // Clear the pagination container first
        paginationContainer.innerHTML = '';
    
        // Only render pagination if there are more than 20 results
        if (totalResults <= resultsPerPage) return;
    
        let output = '<nav class="pagination" aria-label="Pagination"><ul class="pagination__list">';
    
        // Add "Previous" button with proper page decrement
        if (currentPage > 1) {
            output += `<li class="pagination__item pagination__item--arrow">
                <a href="javascript:void(0);" class="pagination__link pagination__link--previous" aria-label="Previous page" data-page="${currentPage - 1}">
                    <span class="pagination__link-text">Previous</span>
                </a>
            </li>`;
        }
    
        const maxVisiblePages = 7;
        let startPage = Math.max(1, currentPage - 3);
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
        if (startPage > 1) {
            output += `<li class="pagination__item"><a href="javascript:void(0);" class="pagination__button" data-page="1" aria-label="Page 1">1</a></li>`;
            if (startPage > 2) {
                output += '<li class="pagination__item pagination__item--overflow" aria-label="ellipsis indicating non-visible pages"><span>…</span></li>';
            }
        }
    
        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                output += `<li class="pagination__item"><a href="javascript:void(0);" class="pagination__button pagination__button--current" aria-label="Page ${i}" aria-current="page">${i}</a></li>`;
            } else {
                output += `<li class="pagination__item"><a href="javascript:void(0);" class="pagination__button" data-page="${i}" aria-label="Page ${i}">${i}</a></li>`;
            }
        }
    
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                output += '<li class="pagination__item pagination__item--overflow" aria-label="ellipsis indicating non-visible pages"><span>…</span></li>';
            }
            output += `<li class="pagination__item"><a href="javascript:void(0);" class="pagination__button" data-page="${totalPages}" aria-label="Page ${totalPages}">${totalPages}</a></li>`;
        }
    
        // Add "Next" button with proper page increment
        if (currentPage < totalPages) {
            output += `<li class="pagination__item pagination__item--arrow">
                <a href="javascript:void(0);" class="pagination__link pagination__link--next" aria-label="Next page" data-page="${currentPage + 1}">
                    <span class="pagination__link-text">Next</span>
                </a>
            </li>`;
        }
    
        output += '</ul></nav>';
        paginationContainer.innerHTML = output;
    
        // Attach event listeners to the pagination buttons
        document.querySelectorAll('.pagination__button, .pagination__link').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent the default link behavior
                const newPage = button.getAttribute('data-page');  // Fix: Use button instead of event target directly
                if (newPage) {
                    const query = document.getElementById('searchQuery').value;
                    const params = new URLSearchParams(window.location.search);
                    params.set('page', newPage);
                    params.set('query', query);
    
                    // Update the URL and perform the search with the new page number
                    window.history.replaceState({}, '', `${location.pathname}?${params.toString()}`);
                    performSearch(false); // Ensure that this triggers the search with the updated page number
    
                    // Focus back to the top of the results for accessibility and screen readers
                    resultsSummary.scrollIntoView({ behavior: 'smooth' });
                    resultsSummary.focus();
                    resultsSummary.setAttribute('aria-live', 'polite');
                    resultsSummary.textContent = `Showing results for "${query}" on page ${newPage}.`;
                }
            });
        });
    }

    function renderFilterSelections() {
        filterSelectionsContainer.innerHTML = '';

        let dateFilterApplied = false;

        for (let [key, values] of Object.entries(selectedFacets)) {
            if (Array.isArray(values) && values.length > 0) {
                values.forEach(value => {
                    if (key === 'updated_since' || key === 'updated_until') {
                        dateFilterApplied = true;
                        return; // Skip rendering date filters as buttons
                    }

                    const button = document.createElement('button');
                    button.classList.add('dynamic-chip');
                    button.setAttribute('aria-expanded', 'false');
                    button.setAttribute('aria-controls', 'filter');
                    button.setAttribute('aria-label', `Remove ${key} filter from search`);
                    button.innerHTML = `<span class="filter-label">${value}</span><span class="filter-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 426.667 426.667" xml:space="preserve"><g><polygon points="426.667,59.733 366.933,0 213.333,153.6 59.733,0 0,59.733 153.6,213.333 0,366.933 59.733,426.667 213.333,273.067 366.933,426.667 426.667,366.933 273.067,213.333 "></polygon></g></svg></span>`;
                    button.addEventListener('click', () => {
                        selectedFacets[key] = selectedFacets[key].filter(v => v !== value);
                        performSearch(false, true);
                    });
                    filterSelectionsContainer.appendChild(button);
                });
            } else if (values && !Array.isArray(values)) {
                if (key === 'updated_since' || key === 'updated_until') {
                    dateFilterApplied = true;
                    continue; // Skip rendering date filters as buttons
                }

                const button = document.createElement('button');
                button.classList.add('dynamic-chip');
                button.setAttribute('aria-expanded', 'false');
                button.setAttribute('aria-controls', 'filter');
                button.setAttribute('aria-label', `Remove ${key} filter from search`);
                button.innerHTML = `<span class="filter-label">${values}</span><span class="filter-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 426.667 426.667" xml:space="preserve"><g><polygon points="426.667,59.733 366.933,0 213.333,153.6 59.733,0 0,59.733 153.6,213.333 0,366.933 59.733,426.667 213.333,273.067 366.933,426.667 426.667,366.933 273.067,213.333 "></polygon></g></svg></span>`;
                button.addEventListener('click', () => {
                    selectedFacets[key] = null;
                    performSearch(false, true);
                });
                filterSelectionsContainer.appendChild(button);
            }
        }

        if (dateFilterApplied || filterSelectionsContainer.childElementCount > 0) {
            const clearButton = document.createElement('button');
            clearButton.classList.add('vac-selections');
            clearButton.textContent = 'Clear Filters';
            clearButton.addEventListener('click', () => {
                performSearch(true, true);
            });
            filterSelectionsContainer.appendChild(clearButton);
        }
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        performSearch(true, true);
    });

    initializeFacetsFromURL(); // Initialize facets from URL on page load

    if (window.location.search) {
        performSearch();
    }
});