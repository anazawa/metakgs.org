package MetaKGS::UpstreamFiles;
use strict;
use warnings;
use parent qw/Amon2/;
use Cache::FileCache;
use Date::Simple qw/ymd/;
use HTTP::Status qw/:constants status_message/;
use List::MoreUtils qw/uniq/;
use Log::Minimal qw/warnf/;
use Plack::Request;
use Plack::Response;
use URI::Fetch;
use Time::Seconds qw/ONE_HOUR/;
use Time::HiRes qw/time sleep/;

our $VERSION = '0.01';

our $FILENAME_RE = qr{^
    [a-z][a-z0-9]{0,9}
    (?:
        -[a-z][a-z0-9]{0,9}        # "foo-bar"
      | (?:-[2-9]|-[1-9]\d+)?      # "foo", "foo-2", ...
      | (?:-[a-z][a-z0-9]{0,9}){3} # "foo-bar-baz-qux"
    )
    \.sgf
$}xi;

sub cache {
    my $self = shift;
    $self->{cache} ||= $self->_build_cache;
}

sub _build_cache {
    my $self = shift;

    Cache::FileCache->new({
        namespace          => 'files.gokgs.com',
        default_expires_in => '1 hour',
        auto_purge_on_get  => 1,
    });
}

sub user_agent {
    my $self = shift;
    $self->{user_agent} ||= $self->_build_user_agent;
}

sub _build_user_agent {
    my $self = shift;
    my $config = $self->config->{+__PACKAGE__} || {};

    my $user_agent = LWP::UserAgent->new(
        agent => __PACKAGE__ . "/$VERSION",
        %{ $config->{user_agent} || {} },
    );

    $user_agent->add_handler(
        request_prepare => sub {
            my $delay = $self->last_visit + $self->delay - time;
            sleep $delay if $delay > 0;
        }
    );

    $user_agent->add_handler(
        response_done => sub {
            $self->last_visit( time );
        }
    );

    $user_agent;
}

sub delay {
    my $self = shift;

    unless ( exists $self->{delay} ) {
        my $config = $self->config->{+__PACKAGE__} || {};
        $self->{delay} = exists $config->{delay} ? $config->{delay} : 60;
    }

    $self->{delay};
}

sub last_visit {
    my $self = shift;
    $self->{last_visit} = shift if @_;
    $self->{last_visit} = 0 unless exists $self->{last_visit};
    $self->{last_visit};
}

sub is_game_path {
    my ( $self, $path ) = @_;
    my ( $year, $month, $day, $filename ) = ( split m{/}, $path, 6 )[2..5];

    my $users = $filename || '';
       $users =~ s/(?:-\d+)?\.sgf$//;
       $users = [ map { lc } split /-/, $users ];

    return 0 unless $path =~ m{^/games/};
    return 0 unless $year and $year =~ /^[1-9]\d*$/ and $year >= 2000;
    return 0 unless $month and $month =~ /^[1-9]\d*$/;
    return 0 unless $day and $day =~ /^[1-9]\d*$/;
    return 0 unless ymd( $year, $month, $day );
    return 0 unless $filename and $filename =~ /^$FILENAME_RE$/;
    return 0 unless @$users == uniq @$users;

    1;
}

sub to_app {
    my $self = shift;
    sub { $self->call(@_) }
}

sub call {
    my ( $self, $env ) = @_;
    my $request = Plack::Request->new( $env );

    return $self->method_not_allowed if $request->method !~ /^(?:GET|HEAD)$/;
    return $self->not_found unless $self->is_game_path( $request->path );

    my $fetch = URI::Fetch->fetch(
        'http://files.gokgs.com' . $request->path,
        UserAgent      => $self->user_agent,
        Cache          => $self->cache,
        NoNetwork      => ONE_HOUR,
        ForceResponse  => 1,
    );

    if ( my $res = $fetch->http_response ) {
        my $client_warning = $res->header('Client-Warning') || q{};
        my $client_aborted = $res->header('Client-Aborted') || q{};

        my $error;
        if ( $client_warning eq 'Internal response' ) {
            $error = $res->content || q{};
        }
        elsif ( $client_aborted eq 'die' ) {
            $error = $res->header('X-Died') || q{};
        }

        warnf 'GET %s failed: %s', $res->request->uri, $error if defined $error;
    }

    return $self->not_found unless $fetch->is_success;

    my $response = Plack::Response->new(
        HTTP_OK,
        [
            'Content-Type'   => $fetch->content_type,
            'Content-Length' => length $fetch->content,
        ],
        $fetch->content
    );

    $response->header( 'ETag' => $fetch->etag );
    $response->headers->last_modified( $fetch->last_modified );
    $response->header( 'Cache-Control' => [qw/public s-maxage=3600/] );

    $response->finalize;
}

sub method_not_allowed { shift->_error( HTTP_METHOD_NOT_ALLOWED, @_ ) }
sub not_found          { shift->_error( HTTP_NOT_FOUND,          @_ ) }

sub _error {
    my $self = shift;
    my $code = shift;
    my $body = shift || status_message $code;

    [
        $code,
        [
            'Content-Length' => length $body,
            'Content-Type'   => 'text/plain',
        ],
        [ $body ]
    ];
}

1;
