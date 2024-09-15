<?php
/**
 * Plugin Name: Search.gov for VA
 * Description: A plugin to integrate a custom search feature using the search.gov API.
 * Version: 1.0
 * Requires at least: 6.6
 * Requires PHP: 8.2
 * Author: Department Of Veterans Affairs
 * Developer: Stephne Walker + CGPT
 * Text Domain: search-gov-for-va
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// Define constants for paths and URLs.
define('SEARCH_GOV_FOR_VA_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SEARCH_GOV_FOR_VA_PLUGIN_URL', plugin_dir_url(__FILE__));

// Include necessary files.
require_once SEARCH_GOV_FOR_VA_PLUGIN_DIR . 'includes/enqueue-scripts.php';
require_once SEARCH_GOV_FOR_VA_PLUGIN_DIR . 'includes/admin-settings.php';
require_once SEARCH_GOV_FOR_VA_PLUGIN_DIR . 'includes/ajax-handler.php';

// Hook to enqueue scripts on the frontend.
add_action('wp_enqueue_scripts', 'search_gov_for_va_enqueue_scripts');

// Hook to add admin settings.
add_action('admin_menu', 'search_gov_for_va_admin_menu');
add_action('admin_init', 'search_gov_for_va_settings_init');

// Function to get plugin settings securely
function search_gov_for_va_get_setting($key) {
    return get_option('search_gov_for_va_' . $key);
}