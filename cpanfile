requires 'perl', '5.010_001';
requires 'constant';
requires 'parent';
requires 'Exporter';
requires 'Encode';
requires 'List::MoreUtils';
requires 'Scalar::Util';

# Date/Time
requires 'Time::HiRes';
requires 'Time::Piece', '1.20';
requires 'Time::Seconds';
requires 'Date::Simple';

# Web Application Framework
requires 'Amon2', '6.02';
requires 'Amon2::Web';
requires 'Amon2::Web::Response';
requires 'Amon2::Plugin::Web::JSON';
requires 'Router::Boom', '0.06';

# View
requires 'Text::Xslate', '2.0009';
requires 'JSON', '2.50';
requires 'Text::Unidecode';
requires 'HTML::WikiConverter::Markdown';

# PSGI/Plack
requires 'Starlet', '0.20';
requires 'Plack::Request';
requires 'Plack::Response';
requires 'Plack::Middleware::Cached';
requires 'Plack::Middleware::ReverseProxy', '0.09';
requires 'Plack::Util';
requires 'Cache::FileCache';

# Database
requires 'DBI';
requires 'Teng', '0.18';
requires 'Teng::Schema::Declare';
requires 'Teng::Row';
requires 'SQL::NamedPlaceholder';
requires 'DBD::SQLite', '1.33';
requires 'DBIx::QueryLog';
requires 'Data::UUID';

# Exception
requires 'Try::Tiny';
requires 'Exception::Class';
requires 'Log::Minimal';

# Job Queue
requires 'TheSchwartz';
requires 'TheSchwartz::Worker';
requires 'TheSchwartz::Simple';
requires 'Data::ObjectDriver::Driver::DBI';
requires 'Parallel::Prefork';

# Scraper
requires 'WWW::GoKGS', '0.21';
requires 'HTML::TreeBuilder::LibXML';

# HTTP
requires 'LWP::UserAgent';
requires 'HTTP::Status';
requires 'URI';
requires 'URI::Fetch';
requires 'URI::Escape';
requires 'HTTP::Request';
requires 'HTTP::Headers::Util';

# Validator
requires 'Data::FormValidator';
requires 'Data::FormValidator::Constraints::Dates';

requires 'Digest::MD5';

on configure => sub {
    requires 'Module::Build', '0.38';
    requires 'Module::CPANfile', '0.9010';
};

on test => sub {
    requires 'Test::More', '0.98';
    requires 'Test::WWW::Mechanize::PSGI';
};
