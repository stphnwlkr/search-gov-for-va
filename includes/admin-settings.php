<?php

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

function search_gov_for_va_admin_menu() {
    add_options_page(
        'Search.gov for VA Settings',
        'Search.gov for VA',
        'manage_options',
        'search-gov-for-va',
        'search_gov_for_va_options_page'
    );
}

function search_gov_for_va_settings_init() {
    register_setting('search_gov_for_va', 'search_gov_for_va_affiliate');
    register_setting('search_gov_for_va', 'search_gov_for_va_access_key');

    add_settings_section(
        'search_gov_for_va_section',
        'Search.gov API Settings',
        null,
        'search-gov-for-va'
    );

    add_settings_field(
        'search_gov_for_va_affiliate',
        'Affiliate',
        'search_gov_for_va_affiliate_render',
        'search-gov-for-va',
        'search_gov_for_va_section'
    );

    add_settings_field(
        'search_gov_for_va_access_key',
        'Access Key',
        'search_gov_for_va_access_key_render',
        'search-gov-for-va',
        'search_gov_for_va_section'
    );
}

function search_gov_for_va_affiliate_render() {
    $value = get_option('search_gov_for_va_affiliate');
    echo '<input type="text" name="search_gov_for_va_affiliate" value="' . esc_attr($value) . '">';
}

function search_gov_for_va_access_key_render() {
    $value = get_option('search_gov_for_va_access_key');
    echo '<input type="text" name="search_gov_for_va_access_key" value="' . esc_attr($value) . '">';
}

function search_gov_for_va_options_page() {
    ?>
    <form action="options.php" method="post">
        <h1>Search.gov for VA</h1>
        <?php
        settings_fields('search_gov_for_va');
        do_settings_sections('search-gov-for-va');
        submit_button();
        ?>
    </form>
    <?php
}