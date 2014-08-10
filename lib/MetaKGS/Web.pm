package MetaKGS::Web;
use strict;
use warnings;
use parent qw/MetaKGS Amon2::Web/;
use LWP::UserAgent;
use MetaKGS::Web::Response;
use MetaKGS::Web::RouterBoom;
use MetaKGS::Web::View::Xslate;
use TheSchwartz::Simple;
use TheSchwartz::Simple::Job;
use Try::Tiny;

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
        $response->header( 'Cache-Control' => 'private' );

        return;
    },
);

sub create_view {
    MetaKGS::Web::View::Xslate->instance;
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

        $self->{user_agent} = LWP::UserAgent->new(
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
