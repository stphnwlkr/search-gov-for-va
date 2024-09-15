<?php

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// Handle the AJAX requests
add_action('wp_ajax_search_gov_for_va', 'search_gov_for_va_handle_ajax');
add_action('wp_ajax_nopriv_search_gov_for_va', 'search_gov_for_va_handle_ajax');

function search_gov_for_va_handle_ajax() {
    if (!isset($_POST['query'])) {
        wp_send_json_error('Query parameter is missing');
        return;
    }

    // Sanitize input
    $query = stripslashes(sanitize_text_field($_POST['query'])); // Remove unnecessary slashes from query
    $page = isset($_POST['page']) ? intval($_POST['page']) : 1;
    $offset = ($page - 1) * 20;

    $tags = isset($_POST['tags']) ? array_map('sanitize_text_field', $_POST['tags']) : [];
    $searchgov_custom2 = isset($_POST['searchgov_custom2']) ? array_map('sanitize_text_field', $_POST['searchgov_custom2']) : [];
    $updated_until = isset($_POST['updated_until']) ? sanitize_text_field($_POST['updated_until']) : '';
    $updated_since = isset($_POST['updated_since']) ? sanitize_text_field($_POST['updated_since']) : '';

    // Build the API URL
    $affiliate = search_gov_for_va_get_setting('affiliate');
    $access_key = urlencode(search_gov_for_va_get_setting('access_key')); // URL-encode the access key

    $params = [
        'affiliate' => $affiliate,
        'access_key' => $access_key,
        'query' => $query,  // Use the raw query as-is, including quotes if present
        'include_facets' => 'true',
        'offset' => $offset,
    ];

    if (!empty($tags)) {
        $params['tags'] = implode(',', $tags);
    }
    if (!empty($searchgov_custom2)) {
        $params['searchgov_custom2'] = implode(',', $searchgov_custom2);
    }
    if (!empty($updated_until) && !empty($updated_since)) {
        $params['updated_until'] = $updated_until;
        $params['updated_since'] = $updated_since;
    }

    $api_url = add_query_arg($params, 'https://api.gsa.gov/technology/searchgov/v2/results/i14y');

    // Log the API URL for debugging
    error_log('API URL: ' . $api_url);

    // Perform the request to the API
    $response = wp_remote_get($api_url);

    if (is_wp_error($response)) {
        error_log('Error fetching results from the API: ' . $response->get_error_message());
        wp_send_json_error('Error fetching results from the API');
        return;
    }

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    // Log the API response for debugging
    error_log('API Response: ' . print_r($data, true));

    // Check if the API response contains the expected data
    if (isset($data['web'])) {
        $total = isset($data['web']['total']) ? $data['web']['total'] : 0;
        $results = isset($data['web']['results']) ? $data['web']['results'] : [];
        $aggregations = isset($data['web']['aggregations']) ? $data['web']['aggregations'] : [];

        wp_send_json_success([
            'total' => $total,
            'results' => $results,
            'aggregations' => $aggregations,
        ]);
    } else {
        wp_send_json_error('Invalid API response structure');
    }
}