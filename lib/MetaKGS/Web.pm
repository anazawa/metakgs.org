package MetaKGS::Web;
use strict;
use warnings;
use parent qw/MetaKGS Amon2::Web/;
use MetaKGS::LWP::UserAgent;
use MetaKGS::Web::Response;
use MetaKGS::Web::RouterBoom;
use MetaKGS::Web::Text::Xslate;
use TheSchwartz::Simple;
use TheSchwartz::Simple::Job;
use Try::Tiny;
use URI::Escape qw//;

__PACKAGE__->load_plugins(
    'Web::JSON',
);

__PACKAGE__->add_trigger(
    AFTER_DISPATCH => sub {
        my ( $c, $response ) = @_;

        # http://blogs.msdn.com/b/ie/archive/2008/07/02/ie8-security-part-v-comprehensive-protection.aspx
        $response->header( 'X-Content-Type-Options' => 'nosniff' );

        # http://blog.mozilla.com/security/2010/09/08/x-frame-options/
        $response->header( 'X-Frame-Options' => 'DENY' );

        # Cache control.
        if ( !$response->header('Cache-Control') ) {
            $response->header( 'Cache-Control' => 'private' );
        }

        return;
    },
);

sub create_view {
    MetaKGS::Web::Text::Xslate->instance;
}

sub create_response {
    my ( $self, @args ) = @_;
    MetaKGS::Web::Response->new( @args );
}

sub absolute_uri_for {
    my ( $self, $path, $query ) = @_;
    my $encoding = $self->encoding;
    my $request = $self->request;

    $path =~ s{^/}{};

    my @query;
    for my $key ( keys %$query ) {
        my $value = $encoding->encode( $query->{$key} );
           $value = URI::Escape::uri_escape( $value );

        push @query, "$key=$value";
    }

    my $base_uri = $request->base->as_string;
       $base_uri =~ s{([^/])$}{$1/};

    $base_uri . $path . ( @query ? '?' . join '&', @query : q{} );
}


sub the_schwartz {
    my $self = shift;
    $self->{the_schwartz} ||= $self->_build_the_schwartz;
}

sub _build_the_schwartz {
    my $self = shift;
    my $config = $self->config->{'TheSchwartz'} || [];
    my $dbh = DBI->connect( @$config );
    TheSchwartz::Simple->new([ $dbh ]);
}

sub user_agent {
    my $self = shift;

    unless ( exists $self->{user_agent} ) {
        my $config = $self->config->{+__PACKAGE__} || {};

        $self->{user_agent} = MetaKGS::LWP::UserAgent->new(
            agent => 'MetaKGS/0.01',
            %{ $config->{user_agent} || {} },
        );
    }

    $self->{user_agent};
}

sub upstream_uri {
    my $self = shift;

    unless ( exists $self->{upstream_uri} ) {
        my $config = $self->config->{'MetaKGS::Web'} || {};
        $self->{upstream_uri} = $config->{upstream_uri};
    }

    $self->{upstream_uri};
}

sub dispatch {
    my $self = shift;
    my $env = $self->request->env;
    my $request = $self->request;
    my $router = MetaKGS::Web::RouterBoom->instance;

    my ( $destination, $captured, $method_not_allowed )
        = $router->match( $env->{REQUEST_METHOD}, $env->{PATH_INFO} );

    return $self->res_405 if $method_not_allowed;
    return $self->res_404 unless $destination;

    try {
        my $class = $destination->{controller};
        my $method = $destination->{action};
        $class->$method( $self, $captured );
    }
    catch {
        warn $request->method, ' ', $request->path_info, " failed: $_";
        $self->res_500;
    };
}

1;
