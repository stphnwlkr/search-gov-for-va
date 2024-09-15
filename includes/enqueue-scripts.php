<?php

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

function search_gov_for_va_enqueue_scripts() {
    wp_enqueue_script('search-gov-for-va-script', SEARCH_GOV_FOR_VA_PLUGIN_URL . 'assets/search.js', array(), '1.0', true);

    // Localize the script with the AJAX URL
    wp_localize_script('search-gov-for-va-script', 'SearchGovForVA', array(
        'ajax_url' => admin_url('admin-ajax.php'),
    ));
}