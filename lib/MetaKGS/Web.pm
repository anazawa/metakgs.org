package MetaKGS::Web;
use strict;
use warnings;
use parent qw/MetaKGS Amon2::Web/;
use Class::Method::Modifiers qw/around/;
use MetaKGS::Web::RouterBoom;
use MetaKGS::Web::View::Xslate;
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

sub dispatch {
    my $self = shift;
    my $env = $self->request->env;
    my $router = MetaKGS::Web::RouterBoom->instance;

    my ( $destination, $captured, $method_not_allowed )
        = $router->match( $env->{REQUEST_METHOD}, $env->{PATH_INFO} );

    return $self->res_405 if $method_not_allowed;
    return $self->res_404 unless $destination;

    my $class = $destination->{controller};
    my $method = $destination->{action};
    my %args = ( %$captured, %{$destination->{args}} );

    try {
        $class->$method( $self, \%args );
    }
    catch {
        warn $request->method, ' ', $request->path_info, " failed: $_";
        $self->res_500;
    };
}

around render_json => sub {
    my ( $orig, $self, $class, $args ) = @_;
    my $method = $class =~ s/\#(\w+)$// && $1;
    $class = Plack::Util::load_class( $class, 'MetaKGS::Web::View::JSON' );
    $self->$orig( $class->$method({ %$args }) );
};

1;
