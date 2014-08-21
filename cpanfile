requires 'Amon2', '6.02';
requires 'DBD::SQLite', '1.33';
requires 'HTML::FillInForm::Lite', '1.11';
requires 'HTTP::Session2', '0.04';
requires 'JSON', '2.50';
requires 'Module::Functions', '2';
requires 'Plack::Middleware::ReverseProxy', '0.09';
requires 'Router::Boom', '0.06';
requires 'Starlet', '0.20';
requires 'Teng', '0.18';
requires 'Test::WWW::Mechanize::PSGI';
requires 'Text::Xslate', '2.0009';
requires 'Time::Piece', '1.20';
requires 'perl', '5.010_001';

requires 'SQL::NamedPlaceholder';
requires 'Data::FormValidator';
requires 'Exception::Class';
requires 'Try::Tiny';
requires 'Class::Method::Modifiers';
requires 'WWW::GoKGS', '0.21';
requires 'String::CamelCase';
requires 'HTML::TreeBuilder::LibXML';
requires 'Data::UUID';
requires 'HTTP::Status';
requires 'URI';
requires 'Encode';
requires 'TheSchwartz::Simple';
requires 'Cache::FileCache';
requires 'Plack::App::Proxy';
requires 'Plack::Middleware::Cached';
requires 'Log::Minimal';
requires 'HTML::WikiConverter::Markdown';
requires 'Text::Unidecode';

on configure => sub {
    requires 'Module::Build', '0.38';
    requires 'Module::CPANfile', '0.9010';
};

on test => sub {
    requires 'Test::More', '0.98';
};
