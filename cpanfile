requires 'Amon2', '6.02';
requires 'JSON', '2.50';
requires 'Module::Functions', '2';
requires 'Plack::Middleware::ReverseProxy', '0.09';
requires 'Router::Boom', '0.06';
requires 'Starlet', '0.20';
requires 'Test::WWW::Mechanize::PSGI';
requires 'Text::Xslate', '2.0009';
requires 'Time::Piece', '1.20';
requires 'perl', '5.010_001';

requires 'Plack::App::Proxy';
requires 'Plack::Middleware::Cached';

requires 'Teng', '0.18';
requires 'SQL::NamedPlaceholder';
requires 'DBD::SQLite', '1.33';
requires 'DBIx::QueryLog';

requires 'HTTP::Status';
requires 'URI';

requires 'Data::FormValidator';
requires 'Exception::Class';
requires 'Try::Tiny';
requires 'Class::Method::Modifiers';
requires 'String::CamelCase';
requires 'Data::UUID';
requires 'Encode';
requires 'Cache::FileCache';
requires 'Log::Minimal';
requires 'HTML::WikiConverter::Markdown';
requires 'Text::Unidecode';
requires 'List::MoreUtils';

requires 'TheSchwartz';
requires 'TheSchwartz::Simple';
requires 'Parallel::Prefork';

requires 'WWW::GoKGS', '0.21';
requires 'HTML::TreeBuilder::LibXML';

on configure => sub {
    requires 'Module::Build', '0.38';
    requires 'Module::CPANfile', '0.9010';
};

on test => sub {
    requires 'Test::More', '0.98';
};
