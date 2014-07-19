package MetaKGS::Web::RouterBoom::Declare;
use strict;
use warnings;
use Plack::Util;
use Router::Boom::Method;

sub import {
    my $class = shift;
    my $package = caller;

    my %stash = (
        router => Router::Boom::Method->new,
        namespace => 'MetaKGS::Web::Controller',
    );

    my %exports = (
        instance => sub { $stash{router} },
        namespace => sub { $stash{namespace} = $_[0] },
        get => _get( \%stash ),
    );

    while ( my ($name, $code) = each %exports ) {
        my $full_name = "$package\::$name";
        do { no strict 'refs'; *$full_name = $code };
    }

    return;
}

sub _get {
    my $stash = shift;

    sub {
        my ( $path, $dest, $args ) = @_;
        my $action = $dest =~ s{\#(\w+)$}{} && $1;
        my $controller = Plack::Util::load_class( $dest, $stash->{namespace} );

        $stash->{router}->add(['GET', 'HEAD'], $path, {
            controller => $controller,
            action => $action,
            args => $args || {},
        });

        return;
    };
}

1;
