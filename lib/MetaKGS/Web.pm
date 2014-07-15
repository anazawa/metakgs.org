package MetaKGS::Web;
use strict;
use warnings;
use utf8;
use parent qw/MetaKGS Amon2::Web/;
use File::Spec;

# dispatcher
use MetaKGS::Web::Dispatcher;
sub dispatch {
    return (MetaKGS::Web::Dispatcher->dispatch($_[0]) or die "response is not generated");
}

# load plugins
__PACKAGE__->load_plugins(
    'Web::FillInFormLite',
    'Web::JSON',
    '+MetaKGS::Web::Plugin::Session',
);

# setup view
use MetaKGS::Web::View;
{
    sub create_view {
        my $view = MetaKGS::Web::View->make_instance(__PACKAGE__);
        no warnings 'redefine';
        *MetaKGS::Web::create_view = sub { $view }; # Class cache.
        $view
    }
}

# for your security
__PACKAGE__->add_trigger(
    AFTER_DISPATCH => sub {
        my ( $c, $res ) = @_;

        # http://blogs.msdn.com/b/ie/archive/2008/07/02/ie8-security-part-v-comprehensive-protection.aspx
        $res->header( 'X-Content-Type-Options' => 'nosniff' );

        # http://blog.mozilla.com/security/2010/09/08/x-frame-options/
        $res->header( 'X-Frame-Options' => 'DENY' );

        # Cache control.
        $res->header( 'Cache-Control' => 'private' );
    },
);

1;
